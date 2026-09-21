/**
 * Repo — the only file that knows the database shape. Screens and the store
 * talk in app types (`src/types.ts`); this file translates to and from rows.
 *
 * Every function is a no-op-safe async call: when the cloud isn't configured
 * or the user isn't signed in, callers simply don't call these (see the store).
 */
import { callFunction, supabase } from '@/lib/supabase';
import { targetsFor } from '@/lib/fuel';
import type { Tables, TablesInsert } from '@/lib/database.types';
import type { DayPlan, Level, Macros, Meal, PlanChange, PlanPaces, PlanSeed, Profile, Race, RecentRace, RunHistory, WorkoutType } from '@/types';
import { buildPlan, type PlanBlock } from '@/lib/plan';

const TZ = 'America/New_York';
export const todayISO = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: TZ });
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------------------------------------------------------------- profile
export function rowToProfile(r: Tables<'profiles'>): Profile {
  return {
    age: r.age ?? 29,
    sex: (r.sex as Profile['sex']) ?? '',
    heightIn: Number(r.height_in ?? 69),
    weightLb: Number(r.weight_lb ?? 160),
    diet: r.diet ?? '',
    runDaysPerWeek: r.run_days_per_week ?? 5,
    maxHr: r.max_hr ?? undefined,
    restingHr: r.resting_hr ?? undefined,
    level: (r.level as Level | null) ?? undefined,
    recentRace: (r.recent_race as RecentRace | null) ?? undefined,
    notes: r.notes ?? undefined,
  };
}

export async function loadProfile(userId: string) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data ? { profile: rowToProfile(data), onboarded: !!data.onboarded_at } : null;
}

export async function saveProfile(userId: string, p: Partial<Profile>, extra: { onboarded?: boolean } = {}) {
  const patch: Partial<TablesInsert<'profiles'>> = { updated_at: new Date().toISOString() };
  if (p.age != null) patch.age = p.age;
  if (p.sex != null) patch.sex = p.sex || null;
  if (p.heightIn != null) patch.height_in = p.heightIn;
  if (p.weightLb != null) patch.weight_lb = p.weightLb;
  if (p.diet != null) patch.diet = p.diet;
  if (p.runDaysPerWeek != null) patch.run_days_per_week = p.runDaysPerWeek;
  if (p.maxHr != null) patch.max_hr = p.maxHr;
  if (p.restingHr != null) patch.resting_hr = p.restingHr;
  if (p.level != null) patch.level = p.level;
  if (p.recentRace != null) patch.recent_race = p.recentRace;
  if (p.notes != null) patch.notes = p.notes;
  if (extra.onboarded) patch.onboarded_at = new Date().toISOString();
  await supabase.from('profiles').update(patch).eq('id', userId);
}

// ---------------------------------------------------------------- race / block
const DIST_MILES: Record<Race['distance'], number> = { '5K': 3.1, '10K': 6.2, Half: 13.1, Marathon: 26.2 };

export async function loadRace(userId: string): Promise<Race | null> {
  // Onboarding writes stable ids (`<uid>-goal` / `<uid>-block`); prefer those over anything older.
  const [{ data: goals }, { data: blocks }] = await Promise.all([
    supabase.from('goals').select('*').eq('user_id', userId).order('date'),
    supabase.from('blocks').select('*').eq('user_id', userId),
  ]);
  const goal = goals?.find((g) => g.id === `${userId}-goal`) ?? goals?.[0] ?? null;
  const block = blocks?.find((b) => b.id === `${userId}-block`) ?? blocks?.[0] ?? null;
  if (!goal) return null;
  const payload = (goal.payload ?? {}) as { distance?: Race['distance'] };
  const distance: Race['distance'] = payload.distance ?? (/half/i.test(goal.name) ? 'Half' : /10k/i.test(goal.name) ? '10K' : /5k/i.test(goal.name) ? '5K' : 'Marathon');
  const secs = goal.target_seconds;
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  return {
    name: goal.name,
    distance,
    miles: DIST_MILES[distance],
    date: goal.date,
    goalTime: h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`,
    mode: (goal.mode as Race['mode'] | null) ?? 'time',
    totalWeeks: block?.total_weeks ?? 11,
    currentWeek: block?.week ?? 1,
    phase: block?.phase ? block.phase[0] + block.phase.slice(1).toLowerCase() : 'Base',
    ...(Array.isArray(block?.periodization) && block.periodization.length
      ? {
          block: {
            miles: (block.periodization as { miles: number }[]).map((p) => Number(p.miles)),
            phases: (block.periodization as { phase: NonNullable<Race['block']>['phases'][number] }[]).map((p) => p.phase),
            seed: ((block.payload ?? {}) as { seed?: PlanSeed }).seed,
            paces: ((block.payload ?? {}) as { paces?: PlanPaces }).paces,
          },
        }
      : {}),
  };
}

export async function saveRace(userId: string, race: Race) {
  const parts = race.goalTime.split(':').map(Number);
  const target_seconds = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
  await supabase.from('goals').upsert({
    id: `${userId}-goal`,
    user_id: userId,
    name: race.name,
    date: race.date,
    target_seconds,
    mode: race.mode,
    payload: { distance: race.distance },
  });
  // One goal per account: drop anything that isn't the row above.
  await supabase.from('goals').delete().eq('user_id', userId).neq('id', `${userId}-goal`);
}

/** "I'm not training for a race": drop the goal, the block and every future session. */
export async function clearRace(userId: string) {
  await Promise.all([
    supabase.from('goals').delete().eq('user_id', userId),
    supabase.from('blocks').delete().eq('user_id', userId),
    supabase.from('planned_sessions').delete().eq('user_id', userId).gte('date', todayISO()),
  ]);
}

/**
 * Build and store a training block for the user's goal. Replaces any existing plan
 * (sessions from today onward) so re-running onboarding or changing the race is safe.
 * Returns the block so callers can show it immediately.
 */
export async function savePlan(userId: string, race: Race, profile: Profile, history: RunHistory | null = null): Promise<PlanBlock> {
  const plan = buildPlan({ userId, race, profile, history });
  const today = todayISO();
  // Keep history: only sessions from today forward are replaced.
  await supabase.from('planned_sessions').delete().eq('user_id', userId).gte('date', today);
  const rows = plan.sessions
    .filter((s) => s.date >= today)
    .map((s) => ({ id: s.id, user_id: userId, date: s.date, title: s.title, type: s.type, detail: s.detail, structure: [], status: 'planned', provenance: 'original', payload: s.payload }));
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase.from('planned_sessions').upsert(rows.slice(i, i + 200), { onConflict: 'user_id,id' });
    if (error) throw error;
  }
  await supabase.from('blocks').upsert({
    id: `${userId}-block`,
    user_id: userId,
    label: plan.label,
    phase: plan.phase,
    week: plan.week,
    total_weeks: plan.total_weeks,
    periodization: plan.periodization,
    payload: { goalId: `${userId}-goal`, engine: 'plan-v1', seed: plan.seed, paces: plan.paces },
  });
  await supabase.from('blocks').delete().eq('user_id', userId).neq('id', `${userId}-block`);
  return plan;
}

// ---------------------------------------------------------------- week
export function normType(t: string): WorkoutType {
  const s = (t || '').toLowerCase();
  if (s.includes('long')) return 'long';
  if (s.includes('interval') || s.includes('speed') || s.includes('track') || s.includes('rep')) return 'intervals';
  if (s.includes('tempo') || s.includes('threshold')) return 'tempo';
  if (s.includes('recovery')) return 'recovery';
  if (s.includes('rest') || s.includes('off')) return 'rest';
  return 'easy';
}

const fmtPace = (secPerMi: number) => `${Math.floor(secPerMi / 60)}:${String(Math.round(secPerMi % 60)).padStart(2, '0')}`;

/** Monday-first week containing `day`, from planned_sessions (+ matched activities). */
export async function loadWeek(userId: string, day = todayISO()): Promise<{ week: DayPlan[]; todayIndex: number }> {
  const d = new Date(day + 'T00:00:00');
  const dow = d.getDay(); // 0 Sun
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((dow + 6) % 7));
  const dates = Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return x.toLocaleDateString('en-CA');
  });
  const [{ data: sessions }, { data: acts }] = await Promise.all([
    supabase.from('planned_sessions').select('*').eq('user_id', userId).in('date', dates),
    supabase.from('activities').select('matched_session_id, started_at, distance_m, moving_sec, avg_pace_sec_per_mi').eq('user_id', userId).gte('started_at', dates[0]).lte('started_at', dates[6] + 'T23:59:59'),
  ]);
  const summary = (a: { distance_m: number | null; moving_sec: number | null; avg_pace_sec_per_mi: number | null }) =>
    `${((a.distance_m ?? 0) / 1609.344).toFixed(1)} mi · ${Math.floor((a.moving_sec ?? 0) / 60)}:${String((a.moving_sec ?? 0) % 60).padStart(2, '0')} · ${a.avg_pace_sec_per_mi ? fmtPace(Number(a.avg_pace_sec_per_mi)) : '—'} /mi`;
  const week: DayPlan[] = dates.map((date) => {
    const s = (sessions ?? []).find((x) => x.date === date);
    const dt = new Date(date + 'T00:00:00');
    // The day's run: the one matched to the session, else the longest run started that day (synced before the plan existed).
    const onDay = (acts ?? []).filter((a) => todayISO(new Date(a.started_at)) === date).sort((a, b) => (b.distance_m ?? 0) - (a.distance_m ?? 0));
    const act = (s && onDay.find((a) => a.matched_session_id === s.id)) ?? onDay[0];
    if (!s) {
      if (act?.distance_m) return { dow: DOW[dt.getDay()], date: dt.getDate(), iso: date, type: 'easy', title: `Run ${(act.distance_m / 1609.344).toFixed(1)} mi`, miles: 0, note: 'Not on the plan — synced from Strava.', done: summary(act) };
      return { dow: DOW[dt.getDay()], date: dt.getDate(), iso: date, type: 'rest', title: 'Rest', miles: 0, note: 'Nothing planned. Rest or easy movement.' };
    }
    const p = (s.payload ?? {}) as { distanceMi?: number; paceTarget?: string; zone?: string; time?: string; fuel?: string };
    const done = act?.distance_m ? summary(act) : s.status === 'done' ? 'Completed' : undefined;
    return {
      dow: DOW[dt.getDay()],
      date: dt.getDate(),
      iso: date,
      type: normType(s.type),
      title: s.title,
      miles: Number(p.distanceMi ?? 0),
      pace: p.paceTarget,
      effort: p.zone,
      note: s.detail ?? '',
      fuel: p.fuel,
      time: p.time,
      done,
    };
  });
  return { week, todayIndex: Math.max(0, dates.indexOf(day)) };
}

/** Every planned day from this week's Monday to the end of the block — the Plan tab's calendar. */
export async function loadPlan(userId: string, day = todayISO()): Promise<DayPlan[]> {
  const d = new Date(day + 'T00:00:00');
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const { data } = await supabase.from('planned_sessions').select('*').eq('user_id', userId).gte('date', monday.toLocaleDateString('en-CA')).order('date');
  return (data ?? []).map((s) => {
    const p = (s.payload ?? {}) as { distanceMi?: number; paceTarget?: string; zone?: string; time?: string; fuel?: string };
    const dt = new Date(s.date + 'T00:00:00');
    return {
      dow: DOW[dt.getDay()],
      date: dt.getDate(),
      iso: s.date,
      type: normType(s.type),
      title: s.title,
      miles: Number(p.distanceMi ?? 0),
      pace: p.paceTarget,
      effort: p.zone,
      note: s.detail ?? '',
      fuel: p.fuel,
      time: p.time,
      done: s.status === 'done' ? 'Completed' : undefined,
    };
  });
}

/** What Strava has shown us: weekly mileage for the last `weeks` weeks (oldest first) and a few headline numbers. */
export async function loadHistory(userId: string, weeks = 12): Promise<RunHistory> {
  const today = todayISO();
  const monday = new Date(today + 'T00:00:00');
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) - (weeks - 1) * 7);
  const since = monday.toLocaleDateString('en-CA');
  const { data } = await supabase.from('activities').select('started_at, distance_m, moving_sec, max_hr, avg_pace_sec_per_mi').eq('user_id', userId).eq('sport', 'run').gte('started_at', since);
  const acts = data ?? [];
  const weeklyMiles = Array(weeks).fill(0) as number[];
  let maxHr: number | null = null;
  let longest = 0;
  for (const a of acts) {
    const day = new Date(todayISO(new Date(a.started_at)) + 'T00:00:00');
    const idx = Math.floor((day.getTime() - monday.getTime()) / 604800000);
    const mi = (a.distance_m ?? 0) / 1609.344;
    if (idx >= 0 && idx < weeks) weeklyMiles[idx] += mi;
    if (a.max_hr && (!maxHr || a.max_hr > maxHr)) maxHr = a.max_hr;
    if (mi > longest) longest = mi;
  }
  // Last four weeks set the baseline: average volume and distance-weighted pace.
  const recent = acts.filter((a) => new Date(a.started_at).getTime() >= Date.now() - 28 * 86400000);
  const recentMi = recent.reduce((t, a) => t + (a.distance_m ?? 0) / 1609.344, 0);
  const recentSec = recent.reduce((t, a) => t + (a.moving_sec ?? 0), 0);
  // Best effort: the fastest run of ≥ 3 mi in the last eight weeks stands in for a race the runner never typed in.
  const best = acts
    .filter((a) => (a.distance_m ?? 0) >= 3 * 1609.344 && a.avg_pace_sec_per_mi && a.moving_sec && new Date(a.started_at).getTime() >= Date.now() - 56 * 86400000)
    .sort((a, b) => Number(a.avg_pace_sec_per_mi) - Number(b.avg_pace_sec_per_mi))[0];
  return {
    runs: acts.length,
    weeklyMiles: weeklyMiles.map((m) => Math.round(m * 10) / 10),
    weeklyAvg: Math.round(recentMi / 4),
    longestMi: Math.round(longest * 10) / 10,
    maxHr,
    avgPaceSec: recentMi > 0 ? Math.round(recentSec / recentMi) : null,
    bestEffort: best ? { distanceMi: Math.round(((best.distance_m ?? 0) / 1609.344) * 10) / 10, seconds: best.moving_sec ?? 0, date: todayISO(new Date(best.started_at)), source: 'strava' } : null,
  };
}

// ---------------------------------------------------------------- nutrition
export function rowToMeal(r: Tables<'meals'>): Meal {
  return {
    id: r.id,
    name: r.slot,
    desc: r.description,
    time: new Date(r.eaten_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ }),
    kcal: r.kcal,
    carbs: Number(r.carbs_g),
    protein: Number(r.protein_g),
    fat: Number(r.fat_g),
  };
}

export async function loadNutrition(userId: string, day = todayISO()) {
  const [{ data: meals }, { data: supps }, { data: water }] = await Promise.all([
    supabase.from('meals').select('*').eq('user_id', userId).eq('day', day).order('eaten_at'),
    supabase.from('supplement_logs').select('name').eq('user_id', userId).eq('day', day),
    supabase.from('hydration_logs').select('ml').eq('user_id', userId).eq('day', day),
  ]);
  return {
    meals: (meals ?? []).map(rowToMeal),
    supplements: Object.fromEntries((supps ?? []).map((s) => [s.name, true])) as Record<string, boolean>,
    water: (water ?? []).reduce((a, b) => a + b.ml, 0) / 1000,
  };
}

export async function insertMeal(userId: string, m: Omit<Meal, 'id' | 'time'>, kind: 'meal' | 'run_fuel' = 'meal', source = 'quick_add') {
  const { data } = await supabase
    .from('meals')
    .insert({ user_id: userId, slot: m.name, description: m.desc, kcal: m.kcal, carbs_g: m.carbs, protein_g: m.protein, fat_g: m.fat, kind, source, day: todayISO() })
    .select('*')
    .single();
  return data ? rowToMeal(data) : null;
}

export const deleteMeal = (userId: string, id: string) => supabase.from('meals').delete().eq('user_id', userId).eq('id', id);

export async function setSupplement(userId: string, name: string, on: boolean, dose?: string) {
  const day = todayISO();
  if (on) await supabase.from('supplement_logs').upsert({ user_id: userId, day, name, dose });
  else await supabase.from('supplement_logs').delete().eq('user_id', userId).eq('day', day).eq('name', name);
}

export const logWater = (userId: string, litres: number) =>
  supabase.from('hydration_logs').insert({ user_id: userId, ml: Math.round(litres * 1000), day: todayISO() });

/** Persist what the engine decided for today so "we added +520 kcal" is an honest diff. */
export async function saveDailyTargets(userId: string, day: DayPlan, profile: Profile, reason: string) {
  const t: Macros = targetsFor(day, profile);
  await supabase.from('daily_targets').upsert({
    user_id: userId,
    day: todayISO(),
    kcal: t.kcal,
    carbs_g: t.carbs,
    protein_g: t.protein,
    fat_g: t.fat,
    reason,
    engine_version: 'v0',
  });
}

// ---------------------------------------------------------------- proposals / coach
export type OpenProposal = { id: string; scope: string; from: string; to: string; day?: string; summary?: string; added?: { kcal: number; carbs_g: number; sodium_mg: number } };

export async function loadOpenProposals(userId: string): Promise<OpenProposal[]> {
  const { data } = await supabase.from('proposals').select('*').eq('user_id', userId).eq('status', 'proposed');
  return (data ?? []).map((p) => {
    const pl = (p.payload ?? {}) as Record<string, unknown>;
    const after = (pl.after ?? {}) as Record<string, unknown>;
    return {
      id: p.id,
      scope: p.scope,
      from: String(pl.from ?? pl.planned ?? ''),
      to: String(pl.to ?? pl.headline ?? ''),
      day: after.date ? String(after.date) : undefined,
      summary: pl.summary ? String(pl.summary) : undefined,
      added: pl.added as OpenProposal['added'],
    };
  });
}

export async function decideProposal(id: string, decision: 'accepted' | 'dismissed') {
  const { error } = await supabase.rpc('decide_proposal', { p_id: id, p_decision: decision });
  if (error) throw error;
}

export type CoachReply = { reply: string; proposals: (PlanChange & { id: string })[]; summary: string | null; fuel: { kcal: number; carbs_g: number; protein_g: number } | null };

export async function askCoach(message: string): Promise<CoachReply> {
  const out = await callFunction<{ reply: string; proposals: { id: string; day: string; from: string; to: string }[]; summary: string | null; fuel: CoachReply['fuel'] }>('coach', { message });
  return { ...out, proposals: out.proposals.map((p) => ({ ...p, day: p.day })) };
}

/** The coach's opening message right after onboarding (persisted server-side as the first coach turn). */
export const coachIntro = () => callFunction<{ reply: string }>('coach', { intro: true });

export const syncStrava = () => callFunction<{ synced: number; matched: number; proposals: string[] }>('strava-sync');
export const connectStrava = (code: string, redirect_uri: string) => callFunction<{ athlete: { id: number; firstname: string } }>('strava-auth', { code, redirect_uri });
export const connectedProviders = async () => (await supabase.rpc('connected_providers')).data ?? [];
