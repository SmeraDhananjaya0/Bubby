// coach — the in-app coach. Takes a message, answers in Bubbie's voice, and
// when the plan should change it PROPOSES structured changes; the app shows
// them as the strike-through list and the user approves each one, which
// calls decide_proposal(). The model never mutates the plan directly.
//
// POST { message }       →  { reply, proposals: [{ id, day, from, to }], fuel?: { kcal, protein_g, carbs_g } }
// POST { intro: true }   →  { reply } — the opening message right after onboarding, persisted as the first coach turn.
//
// Every call carries a "runner brief" (profile, vitals, goal, block, paces, last four weeks, open proposals) as a
// cached system block, so the coach starts from full context rather than a blank slate.
//
// Secrets: ANTHROPIC_API_KEY. Optional: COACH_MODEL (default claude-sonnet-5).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const TZ = 'America/New_York';
const dayOf = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ });
const pad = (n: number) => String(n).padStart(2, '0');
const fmtPace = (sec: number | null | undefined) => (sec ? `${Math.floor(sec / 60)}:${pad(Math.round(sec % 60))}` : '—');
const fmtClock = (sec: number) => { const s = Math.round(sec); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`; };

const INTRO_PROMPT = `We have just finished setting up my plan. Introduce it in under 120 words: what the next two weeks look
like, why the paces are what they are, and one thing to watch given what you know about me. No questions back, no plan changes.`;

const SYSTEM = `You are the coach inside Bubbie, a marathon-training app where fuel follows the workout.
Voice: calm, specific, second person, short sentences, numbers first, no exclamation marks, no gamification.
You never change the plan yourself. When the plan should change, call propose_plan_changes with concrete
per-day changes and (if fueling changes) new daily targets; the runner approves each change in the app.
Protein stays steady day to day; calories and carbs follow the load. Injury, illness or travel → reduce or rest,
say when you'll check in, and tell them when to see a doctor or physio (swelling, locking, can't bear weight).
Keep replies under 120 words unless asked for detail.`;

const TOOL = {
  name: 'propose_plan_changes',
  description: 'Propose concrete changes to upcoming planned sessions and, optionally, today\'s fuel targets. Only call when the plan should actually change.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'One line the app shows after the user applies, e.g. "4 rest days · back Wed with an easy 3 mi".' },
      changes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'id of the planned session being changed (from context). Omit for a brand-new day.' },
            date: { type: 'string', description: 'YYYY-MM-DD' },
            from: { type: 'string', description: 'What was planned, short: "Long run 16 mi"' },
            to: { type: 'string', description: 'What it becomes, short: "Rest" or "Easy 3 mi, if pain-free"' },
            type: { type: 'string', enum: ['easy', 'recovery', 'intervals', 'tempo', 'long', 'rest'] },
            distance_mi: { type: 'number' },
            pace_target: { type: 'string' },
            zone: { type: 'string' },
            detail: { type: 'string' },
          },
          required: ['date', 'from', 'to', 'type'],
        },
      },
      fuel_today: {
        type: 'object',
        properties: { kcal: { type: 'integer' }, carbs_g: { type: 'integer' }, protein_g: { type: 'integer' }, reason: { type: 'string' } },
      },
    },
    required: ['summary', 'changes'],
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await db.auth.getUser();
    if (!user) return json({ error: 'not signed in' }, 401);
    const body = await req.json().catch(() => ({}));
    const intro = body.intro === true;
    const message: string = typeof body.message === 'string' ? body.message.trim() : '';
    if (!intro && !message) return json({ error: 'message required' }, 400);

    // ---- the runner brief (stable across turns → cached) + today's context (volatile) ----
    const today = dayOf(new Date());
    const weekEnd = dayOf(new Date(Date.now() + 14 * 86400000));
    const since = new Date(Date.now() - 28 * 86400000).toISOString();
    const [{ data: profile }, { data: goal }, { data: block }, { data: acts }, { data: open }, { data: sessions }, { data: history }, nutrition, { data: recovery }] = await Promise.all([
      db.from('profiles').select('age, sex, height_in, weight_lb, diet, run_days_per_week, max_hr, resting_hr, level, recent_race, notes').eq('id', user.id).single(),
      db.from('goals').select('name, date, target_seconds, mode').eq('user_id', user.id).eq('id', `${user.id}-goal`).maybeSingle(),
      db.from('blocks').select('label, phase, week, total_weeks, periodization, payload').eq('user_id', user.id).eq('id', `${user.id}-block`).maybeSingle(),
      db.from('activities').select('started_at, distance_m, moving_sec, avg_hr, avg_pace_sec_per_mi').eq('user_id', user.id).eq('sport', 'run').gte('started_at', since).order('started_at', { ascending: false }),
      db.from('proposals').select('id, scope, session_id, payload').eq('user_id', user.id).eq('status', 'proposed'),
      db.from('planned_sessions').select('id, date, title, type, detail, status, payload').eq('user_id', user.id).gte('date', today).lte('date', weekEnd).order('date'),
      db.from('chat_messages').select('role, body, seq').eq('user_id', user.id).order('seq', { ascending: false }).limit(12),
      db.rpc('nutrition_day', { p_day: today }),
      db.from('recovery_snapshots').select('day, recovery_pct, hrv_ms, rhr').eq('user_id', user.id).order('day', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const runs = (acts ?? []).filter((a) => (a.distance_m ?? 0) > 0);
    const totalMi = runs.reduce((t, a) => t + (a.distance_m ?? 0) / 1609.344, 0);
    const avgPace = totalMi > 0 ? runs.reduce((t, a) => t + (a.moving_sec ?? 0), 0) / totalMi : null;
    const withHr = runs.filter((a) => a.avg_hr);
    const avgHr = withHr.length ? Math.round(withHr.reduce((t, a) => t + Number(a.avg_hr), 0) / withHr.length) : null;
    const longest = runs.reduce((m, a) => Math.max(m, (a.distance_m ?? 0) / 1609.344), 0);
    const bp = (block?.payload ?? {}) as { paces?: unknown; seed?: unknown };
    const weekly = Array.isArray(block?.periodization) ? (block!.periodization as { miles: number }[]).map((p) => p.miles).join(' ') : '';
    const brief = `RUNNER BRIEF
Profile: ${JSON.stringify(profile)}.
Goal: ${goal ? `${goal.name} on ${goal.date} — ${goal.mode === 'finish' ? 'just finish (no time goal)' : `target ${fmtClock(goal.target_seconds)}`}` : 'no race set; everyday running'}.
Block: ${block ? `${block.label}, week ${block.week} of ${block.total_weeks}, phase ${block.phase}; weekly miles by week: ${weekly}` : 'none'}.
Paces (sec/mi; quote as m:ss, and give bpm from the zones when it helps): ${JSON.stringify(bp.paces ?? null)}.
How the plan was seeded: ${JSON.stringify(bp.seed ?? null)}.
Last 4 weeks: ${runs.length} runs, ${totalMi.toFixed(0)} mi, avg pace ${fmtPace(avgPace)}/mi, avg HR ${avgHr ?? '—'}, longest ${longest.toFixed(1)} mi.
Recent runs: ${runs.slice(0, 8).map((a) => `${dayOf(new Date(a.started_at))} ${((a.distance_m ?? 0) / 1609.344).toFixed(1)} mi @ ${fmtPace(a.avg_pace_sec_per_mi)}${a.avg_hr ? ` ${a.avg_hr} bpm` : ''}`).join('; ') || 'none synced'}.
Open proposals awaiting the runner: ${JSON.stringify((open ?? []).map((p) => ({ id: p.id, scope: p.scope, session: p.session_id, what: (p.payload as { headline?: string; summary?: string })?.headline ?? (p.payload as { summary?: string })?.summary ?? null })))}.`;

    const context = `Today: ${today}.
Recovery (latest): ${JSON.stringify(recovery)}.
Nutrition today: ${JSON.stringify(nutrition.data)}.
Upcoming sessions (next 14 days): ${JSON.stringify(sessions)}.`;

    const prior = (history ?? []).reverse().map((m) => ({ role: m.role === 'you' || m.role === 'user' ? 'user' : 'assistant', content: m.body }));
    const messages = [...prior, { role: 'user', content: intro ? INTRO_PROMPT : message }];

    // ---- model ----
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: Deno.env.get('COACH_MODEL') ?? 'claude-sonnet-5',
        max_tokens: 4096, // Sonnet 5 thinks before answering; leave room for that plus the reply and tool call
        // The brief changes only when the plan or profile does, so it sits in the cached prefix; today's context follows.
        system: [{ type: 'text', text: `${SYSTEM}\n\n${brief}`, cache_control: { type: 'ephemeral' } }, { type: 'text', text: context }],
        ...(intro ? {} : { tools: [TOOL] }),
        messages,
      }),
    });
    if (!res.ok) return json({ error: 'model call failed', detail: await res.text() }, 502);
    const out = await res.json();
    const reply = (out.content ?? []).filter((c: { type: string }) => c.type === 'text').map((c: { text: string }) => c.text).join('\n').trim();
    const tool = (out.content ?? []).find((c: { type: string; name?: string }) => c.type === 'tool_use' && c.name === 'propose_plan_changes');

    // ---- persist chat (the intro has no user turn) ----
    const nextSeq = ((history ?? [])[0]?.seq ?? 0) + 1;
    const stamp = Date.now();
    const timeLabel = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
    if (intro) {
      await db.from('chat_messages').insert([{ id: `c-${stamp}`, user_id: user.id, role: 'coach', body: reply || '…', seq: nextSeq, time_label: timeLabel, proposal_refs: null }]);
      return json({ reply, proposals: [], summary: null, fuel: null });
    }
    await db.from('chat_messages').insert([
      { id: `u-${stamp}`, user_id: user.id, role: 'user', body: message, seq: nextSeq, time_label: timeLabel },
      { id: `c-${stamp}`, user_id: user.id, role: 'coach', body: reply || (tool ? tool.input.summary : '…'), seq: nextSeq + 1, proposal_refs: null },
    ]);

    // ---- persist proposals (the user decides in the app) ----
    const created: Array<{ id: string; day: string; from: string; to: string }> = [];
    if (tool) {
      const input = tool.input as { summary: string; changes: Array<Record<string, unknown>>; fuel_today?: Record<string, unknown> };
      for (const [i, ch] of input.changes.entries()) {
        const sess = (sessions ?? []).find((s) => s.id === ch.session_id) ?? (sessions ?? []).find((s) => s.date === ch.date);
        const id = `coach-${stamp}-${i}`;
        const after = {
          id: sess?.id ?? `coach-${ch.date}`,
          date: ch.date,
          title: String(ch.to),
          type: ch.type,
          detail: ch.detail ?? null,
          structure: [],
          status: 'planned',
          distanceMi: ch.distance_mi ?? (ch.type === 'rest' ? 0 : undefined),
          paceTarget: ch.pace_target,
          zone: ch.zone,
        };
        await db.from('proposals').insert({
          id, user_id: user.id, scope: 'session', session_id: sess?.id ?? after.id, status: 'proposed',
          payload: { source: 'coach', before: sess ?? null, after, from: ch.from, to: ch.to, summary: input.summary, message },
        });
        created.push({ id, day: String(ch.date), from: String(ch.from), to: String(ch.to) });
      }
      if (input.fuel_today) {
        const f = input.fuel_today;
        await db.from('daily_targets').upsert({
          user_id: user.id, day: today,
          kcal: Number(f.kcal), carbs_g: Number(f.carbs_g), protein_g: Number(f.protein_g),
          fat_g: Math.max(50, Math.round((Number(f.kcal) * 0.25) / 9)),
          reason: String(f.reason ?? input.summary), engine_version: 'coach',
        });
      }
      await db.from('chat_messages').update({ proposal_refs: created.map((c) => c.id) }).eq('user_id', user.id).eq('id', `c-${stamp}`);
    }

    return json({ reply, proposals: created, summary: tool?.input?.summary ?? null, fuel: tool?.input?.fuel_today ?? null });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
