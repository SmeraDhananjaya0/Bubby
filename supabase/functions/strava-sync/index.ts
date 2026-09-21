// strava-sync — pull the last 90 days of Strava runs, match them to planned sessions,
// recompute today's fuel targets, and file a proposal when a run differed.
//
// POST {}                    → as the signed-in user
// POST { user_id }           → with the service-role key (cron / webhook)
// Returns { synced, matched, proposals, targets }
//
// Secrets: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, TOKEN_ENC_KEY.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const TZ = 'America/New_York';
const dayOf = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD

// ---- crypto (mirror of strava-auth) ----
const b64 = (u8: Uint8Array) => btoa(String.fromCharCode(...u8));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function key(usage: KeyUsage) {
  return crypto.subtle.importKey('raw', unb64(Deno.env.get('TOKEN_ENC_KEY') ?? ''), 'AES-GCM', false, [usage]);
}
async function open(row: { ciphertext: string; iv: string; tag: string }) {
  const data = new Uint8Array([...unb64(row.ciphertext), ...unb64(row.tag)]);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(row.iv) }, await key('decrypt'), data);
  return JSON.parse(new TextDecoder().decode(plain)) as { access_token: string; refresh_token: string };
}
async function seal(plain: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const out = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key('encrypt'), new TextEncoder().encode(plain)));
  return { ciphertext: b64(out.slice(0, -16)), tag: b64(out.slice(-16)), iv: b64(iv) };
}

// ---- HR zones (mirror of src/lib/fitness.ts: % of max, or Karvonen on heart-rate reserve when resting HR is known) ----
const BANDS = { Z1: [0.5, 0.65], Z2: [0.65, 0.75], Z3: [0.75, 0.82], Z4: [0.82, 0.9], Z5: [0.9, 1] } as const;
function zoneFloor(maxHr: number, restingHr: number | null | undefined, zone: keyof typeof BANDS) {
  const rest = restingHr ?? 0;
  return Math.round(rest + BANDS[zone][0] * (maxHr - rest));
}

// ---- fuel engine v0.1 (kept in step with src/lib/fuel.ts) ----
// baseline = Mifflin-St Jeor × 1.35 (daily living, no running); run cost = weight_lb × kcal/lb/mi × miles.
type WT = 'easy' | 'recovery' | 'intervals' | 'tempo' | 'long' | 'rest';
const CARBS_PER_KG: Record<WT, number> = { rest: 3.5, recovery: 4.5, easy: 5, tempo: 6, intervals: 6, long: 6.5 };
const KCAL_PER_LB_MILE: Record<WT, number> = { rest: 0, recovery: 0.6, easy: 0.63, long: 0.63, tempo: 0.68, intervals: 0.72 };
function normType(t: string): WT {
  const s = (t || '').toLowerCase();
  if (s.includes('long')) return 'long';
  if (s.includes('interval') || s.includes('speed') || s.includes('track') || s.includes('rep')) return 'intervals';
  if (s.includes('tempo') || s.includes('threshold')) return 'tempo';
  if (s.includes('recovery')) return 'recovery';
  if (s.includes('rest') || s.includes('off')) return 'rest';
  return 'easy';
}
function targets(profile: { age?: number | null; sex?: string | null; height_in?: number | null; weight_lb?: number | null }, type: WT, miles: number) {
  const lb = profile.weight_lb ?? 160;
  const kg = lb * 0.4536;
  const cm = (profile.height_in ?? 69) * 2.54;
  const bmr = 10 * kg + 6.25 * cm - 5 * (profile.age ?? 30) + (profile.sex === 'Female' ? -161 : 5);
  const base = Math.round((bmr * 1.35) / 10) * 10;
  const run = Math.round((lb * KCAL_PER_LB_MILE[type] * Math.max(0, miles)) / 10) * 10;
  const kcal = base + run;
  const carbsPerKg = type === 'long' ? Math.min(8, CARBS_PER_KG.long + Math.max(0, miles - 10) * 0.15) : CARBS_PER_KG[type];
  const carbs_g = Math.round((kg * carbsPerKg) / 5) * 5;
  const protein_g = Math.round((kg * 1.8) / 5) * 5;
  return {
    kcal,
    carbs_g,
    protein_g,
    fat_g: Math.round(Math.max(kg * 0.8, (kcal - carbs_g * 4 - protein_g * 4) / 9)),
    sodium_mg: type === 'long' ? 3500 : type === 'rest' ? 2300 : 3000,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let userId = '';
  try {
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get('Authorization') ?? '';
    const isService = authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '∅');
    if (isService && body.user_id) userId = body.user_id;
    else {
      const uc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await uc.auth.getUser();
      if (!user) return json({ error: 'not signed in' }, 401);
      userId = user.id;
    }

    // 1. token
    const { data: tokRow } = await admin.from('integration_tokens').select('*').eq('user_id', userId).eq('provider', 'strava').maybeSingle();
    if (!tokRow) return json({ error: 'strava not connected' }, 409);
    let tok = await open(tokRow);
    if (!tokRow.expires_at || new Date(tokRow.expires_at).getTime() < Date.now() + 60_000) {
      const r = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: Deno.env.get('STRAVA_CLIENT_ID'), client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'), grant_type: 'refresh_token', refresh_token: tok.refresh_token }),
      });
      if (!r.ok) throw new Error('token refresh failed: ' + (await r.text()));
      const fresh = await r.json();
      tok = { access_token: fresh.access_token, refresh_token: fresh.refresh_token };
      await admin.from('integration_tokens').update({ ...(await seal(JSON.stringify(tok))), expires_at: new Date(fresh.expires_at * 1000).toISOString(), updated_at: new Date().toISOString() }).eq('user_id', userId).eq('provider', 'strava');
    }

    // 2. activities (last 90 days — enough history for the connected screen and plan seeding)
    const after = Math.floor((Date.now() - 90 * 86400000) / 1000);
    const ar = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200`, { headers: { Authorization: `Bearer ${tok.access_token}` } });
    if (!ar.ok) throw new Error('activities fetch failed: ' + (await ar.text()));
    const acts = (await ar.json()) as Array<Record<string, unknown>>;
    const runs = acts.filter((a) => String(a.sport_type ?? a.type).toLowerCase().includes('run'));

    const { data: profile } = await admin.from('profiles').select('*').eq('id', userId).single();
    const from = dayOf(new Date(Date.now() - 90 * 86400000));
    const { data: sessions } = await admin.from('planned_sessions').select('*').eq('user_id', userId).gte('date', from).order('date');

    let matched = 0;
    const proposals: string[] = [];
    for (const a of runs) {
      const started = new Date(String(a.start_date));
      const miles = Number(a.distance) / 1609.344;
      const movingSec = Number(a.moving_time);
      const row = {
        user_id: userId, strava_id: Number(a.id), sport: 'run',
        started_at: started.toISOString(), ended_at: new Date(started.getTime() + Number(a.elapsed_time) * 1000).toISOString(),
        distance_m: Number(a.distance), moving_sec: movingSec,
        avg_pace_sec_per_mi: miles > 0 ? Math.round(movingSec / miles) : null,
        avg_hr: a.average_heartrate ? Math.round(Number(a.average_heartrate)) : null,
        max_hr: a.max_heartrate ? Math.round(Number(a.max_heartrate)) : null,
        payload: { name: a.name, elevation_m: a.total_elevation_gain, suffer_score: a.suffer_score },
      };
      const day = dayOf(started);
      const session = (sessions ?? []).find((s) => s.date === day);
      const { data: saved } = await admin.from('activities').upsert({ ...row, matched_session_id: session?.id ?? null }, { onConflict: 'strava_id' }).select('id').single();
      if (!session || !saved) continue;
      matched++;

      const planned = Number((session.payload as Record<string, unknown>)?.distanceMi ?? 0);
      const plannedType = normType(session.type);
      // Deviation: ≥ 40% more distance, or an easy day run ≥ 25% faster than the slow end of its pace target.
      const paceTarget = String((session.payload as Record<string, unknown>)?.paceTarget ?? '');
      const slowEnd = paceTarget.split(/[–-]/).pop()?.trim();
      const slowSec = slowEnd && slowEnd.includes(':') ? Number(slowEnd.split(':')[0]) * 60 + Number(slowEnd.split(':')[1]) : null;
      const tooFar = planned > 0 && miles >= planned * 1.4;
      // Too hard: with a max HR on file, an easy or recovery day run at zone 3 or above; otherwise an easy
      // day run ≥ 25% faster than the slow end of its pace target.
      const z3 = profile?.max_hr ? zoneFloor(Number(profile.max_hr), profile.resting_hr, 'Z3') : null;
      const byHr = !!(z3 && row.avg_hr);
      const easyDay = plannedType === 'easy' || plannedType === 'recovery';
      const tooHard = easyDay && (byHr ? Number(row.avg_hr) >= z3! : !!(slowSec && row.avg_pace_sec_per_mi && row.avg_pace_sec_per_mi < slowSec * 0.75));
      if (session.status !== 'done') await admin.from('planned_sessions').update({ status: 'done' }).eq('user_id', userId).eq('id', session.id);

      if (tooFar || tooHard) {
        const asType: WT = tooHard ? 'tempo' : plannedType;
        const before = targets(profile ?? {}, plannedType, planned);
        const after = targets(profile ?? {}, asType, miles);
        const id = `strava-${a.id}`;
        const { data: exists } = await admin.from('proposals').select('id').eq('user_id', userId).eq('id', id).maybeSingle();
        if (!exists) {
          await admin.from('proposals').insert({
            id, user_id: userId, scope: 'fuel', session_id: session.id, status: 'proposed',
            payload: {
              source: 'strava', activity_id: saved.id,
              headline: `${a.name ?? 'Run'} · ${miles.toFixed(1)} mi`,
              planned: `${session.title} · ${planned} mi`,
              avg_hr: row.avg_hr, added: { kcal: after.kcal - before.kcal, carbs_g: after.carbs_g - before.carbs_g, sodium_mg: after.sodium_mg - before.sodium_mg },
              reason: tooHard ? (byHr ? 'Easy day, but your heart rate says workout — today fuels like one.' : 'Ran an easy day hard, so today fuels like a workout.') : 'Ran well past the plan, so today fuels the extra distance.',
            },
          });
          proposals.push(id);
        }
        if (day === dayOf(new Date())) {
          await admin.from('daily_targets').upsert({ user_id: userId, day, ...after, session_id: session.id, reason: tooHard ? (byHr ? 'Easy day run in zone 3 or above' : 'Easy day run at tempo effort') : 'Ran past the planned distance', engine_version: 'v0' });
        }
      }
    }

    // 3. today's targets from the plan (when no deviation already wrote them)
    const today = dayOf(new Date());
    const todaySession = (sessions ?? []).find((s) => s.date === today);
    const { data: haveTargets } = await admin.from('daily_targets').select('day').eq('user_id', userId).eq('day', today).maybeSingle();
    let t = null;
    if (!haveTargets) {
      const type = todaySession ? normType(todaySession.type) : 'rest';
      const miles = Number((todaySession?.payload as Record<string, unknown>)?.distanceMi ?? 0);
      t = targets(profile ?? {}, type, miles);
      await admin.from('daily_targets').upsert({ user_id: userId, day: today, ...t, session_id: todaySession?.id ?? null, reason: todaySession ? `${todaySession.title} planned` : 'Rest day', engine_version: 'v0' });
    }

    await admin.from('sync_runs').insert({ user_id: userId, source: 'strava', ok: true, items: runs.length, detail: `${matched} matched, ${proposals.length} proposals` });
    return json({ synced: runs.length, matched, proposals, targets: t });
  } catch (e) {
    if (userId) await admin.from('sync_runs').insert({ user_id: userId, source: 'strava', ok: false, detail: (e as Error).message });
    return json({ error: (e as Error).message }, 500);
  }
});
