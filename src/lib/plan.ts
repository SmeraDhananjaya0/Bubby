/**
 * Plan builder v1 — turns a goal race + profile + run history into a periodized block of daily sessions.
 *
 * Pure and deterministic (same inputs → same plan) so it runs on the client at onboarding, in an edge
 * function later, or in a test. The output shape is what `planned_sessions` and `blocks` store, so
 * `repo.savePlan()` is a straight insert, and `toDayPlan()` turns a session into what the screens show.
 *
 * Model (kept explainable — the coach has to be able to say *why*):
 *  - Block length: weeks until race day (1–53; a long runway just means a longer, gentler base).
 *  - Phases: taper (3 wks marathon / 2 half / 1 shorter) at the end, peak (3 wks) before it,
 *    the rest split ~45% base / 55% build.
 *  - Seeding from history (≥ 3 synced runs): starting volume = last-four-week average, first long run
 *    = the longest recent run, easy pace never faster than what the runner already does.
 *    No history → conservative defaults for the distance.
 *  - Weekly miles ramp from the start volume to a peak, never more than ~10% a week compounding,
 *    with every 4th week a 20% cutback; taper steps down 75% → 55% → race week.
 *  - The long run grows ~1–2 mi a week (0.5 for 5K/10K), backs off on cutback weeks, and is capped at
 *    20 / 14 / 9 / 6 mi and ~40% of the week.
 *  - Week shape by run days: Mon rest · Tue quality · Wed easy (medium-long for marathon) · Thu quality/easy ·
 *    Fri rest · Sat long · Sun recovery. Fewer run days drop recovery, then Thu, then Wed.
 *  - Quality sessions rotate week to week (800s / 1000s / 1200s, continuous tempo / cruise intervals, hills)
 *    so the block reads like a real plan rather than the same Tuesday twelve times.
 *  - Paces derive from goal pace: easy +75s (or current easy pace, whichever is slower), long = easy −10s,
 *    tempo −20s (marathon) / +5s (half) / +25s (shorter), intervals −50s / −30s / −10s.
 */
import type { DayPlan, PlanSeed, Profile, Race, RunHistory, WorkoutType } from '@/types';
import { dowOf, isoAdd, localISO, mondayOf } from '@/lib/format';

export type Phase = 'base' | 'build' | 'peak' | 'taper';

export type PlanSession = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: WorkoutType;
  detail: string;
  payload: { distanceMi: number; paceTarget?: string; zone?: string; time?: string; fuel?: string; phase: Phase; week: number };
};

export type PlanBlock = {
  label: string;
  total_weeks: number;
  week: number; // 1-based, the week containing `today`
  phase: Phase;
  periodization: { week: number; phase: Phase; miles: number }[];
  sessions: PlanSession[];
  seed: PlanSeed;
};

export const DIST_MI: Record<Race['distance'], number> = { '5K': 3.1, '10K': 6.2, Half: 13.1, Marathon: 26.2 };

export function parseGoalSeconds(goalTime: string): number {
  const p = goalTime.split(':').map((x) => Number(x) || 0);
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : p[0];
}

export const fmtPace = (secPerMi: number) => {
  const s = Math.max(240, Math.round(secPerMi));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const range = (a: number, b: number) => `${fmtPace(a)}–${fmtPace(b)}`;
const round = (x: number, step = 0.5) => Math.round(x / step) * step;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export type PlanInput = {
  userId: string;
  race: Pick<Race, 'name' | 'distance' | 'date' | 'goalTime'>;
  profile: Pick<Profile, 'runDaysPerWeek'>;
  /** What Strava / Apple Health showed for the last 12 weeks, when connected. */
  history?: Pick<RunHistory, 'runs' | 'weeklyAvg' | 'longestMi' | 'avgPaceSec'> | null;
  /** ISO date for "today"; defaults to the local date. */
  today?: string;
};

const DEFAULTS: Record<Race['distance'], { start: number; peak: number; longStart: number; longCap: number; longStep: number; tempoCap: number }> = {
  '5K': { start: 10, peak: 20, longStart: 3, longCap: 6, longStep: 0.5, tempoCap: 5 },
  '10K': { start: 12, peak: 25, longStart: 4, longCap: 9, longStep: 0.5, tempoCap: 6 },
  Half: { start: 15, peak: 32, longStart: 6, longCap: 14, longStep: 1, tempoCap: 7 },
  Marathon: { start: 20, peak: 45, longStart: 8, longCap: 20, longStep: 1.5, tempoCap: 8 },
};

/** True when the history is enough to shape a plan: at least three runs and some volume in the last four weeks. */
export const canSeed = (h: PlanInput['history']) => !!h && h.runs >= 3 && h.weeklyAvg > 0;

/** How much faster than their everyday running a runner can hold for a race, by distance (s/mi). */
const RACE_VS_EASY: Record<Race['distance'], number> = { '5K': 90, '10K': 75, Half: 60, Marathon: 45 };

export function buildPlan(input: PlanInput): PlanBlock {
  const today = input.today ?? localISO();
  const dist = input.race.distance;
  const distMi = DIST_MI[dist];
  const isMarathon = dist === 'Marathon';
  const isHalf = dist === 'Half';
  const isShort = !isMarathon && !isHalf;
  const runDays = clamp(input.profile.runDaysPerWeek || 5, 3, 7);
  const D = DEFAULTS[dist];

  // --- what we're starting from
  const h = input.history;
  const seeded = canSeed(h);
  const goal = parseGoalSeconds(input.race.goalTime) / distMi;
  const estRacePace = seeded && h!.avgPaceSec ? h!.avgPaceSec - RACE_VS_EASY[dist] : null;
  const seed: PlanSeed = {
    source: seeded ? 'history' : 'default',
    runs: h?.runs ?? 0,
    weeklyAvg: h?.weeklyAvg ?? 0,
    longestMi: h?.longestMi ?? 0,
    avgPaceSec: h?.avgPaceSec ?? null,
    goalGapSec: estRacePace != null ? Math.round(estRacePace - goal) : null,
  };

  // --- block length & phases
  const start = mondayOf(today);
  const raceMonday = mondayOf(input.race.date);
  const rawWeeks = Math.round((new Date(raceMonday + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()) / 604800000) + 1;
  // 1–53 weeks: a short runway gives an honest short plan; a long one gets extra base weeks.
  const total = clamp(rawWeeks, 1, 53);
  const taperW = Math.min(isMarathon ? 3 : isHalf ? 2 : 1, Math.max(0, total - 1));
  const peakW = Math.max(0, Math.min(3, total - taperW - 2));
  const remaining = Math.max(0, total - taperW - peakW);
  const baseW = Math.max(remaining > 0 ? 1 : 0, Math.round(remaining * 0.45));
  const phaseOf = (w: number): Phase => (w <= baseW ? 'base' : w <= remaining ? 'build' : w <= remaining + peakW ? 'peak' : 'taper');
  const rampWeeks = Math.max(1, remaining + peakW - 1);

  // --- weekly volume: start where the runner is, aim for the distance's peak, never ramp past ~10%/wk,
  //     and never more than the run days can hold (a long run plus ~7 mi per other day).
  const startMiles = Math.round(seeded ? clamp(h!.weeklyAvg, 8, 70) : D.start);
  const safeCeiling = startMiles * Math.pow(1.1, rampWeeks);
  const daysCeiling = D.longCap + (runDays - 1) * 7;
  const peakMiles = Math.round(clamp(Math.max(D.peak, startMiles * 1.15), startMiles, Math.min(safeCeiling, D.peak * 1.35, daysCeiling)));
  const isCutback = (w: number) => w % 4 === 0 && phaseOf(w) !== 'peak' && phaseOf(w) !== 'taper' && w < total;
  const periodization = Array.from({ length: total }, (_, i) => {
    const w = i + 1;
    const ph = phaseOf(w);
    let miles: number;
    if (ph === 'taper') {
      const k = w - (remaining + peakW); // 1..taperW
      miles = peakMiles * (k === taperW ? 0.35 : k === taperW - 1 ? 0.55 : 0.75);
    } else {
      miles = startMiles + ((peakMiles - startMiles) * (w - 1)) / rampWeeks;
      if (isCutback(w)) miles *= 0.8;
    }
    return { week: w, phase: ph, miles: Math.round(miles) };
  });

  // --- the long run: from what they've done to the distance's cap, one honest step at a time.
  //     It grows linearly to the last peak week (never more than a step a week), backs off on cutback
  //     weeks, and once it's already at the cap it alternates so no one runs 20 miles every Saturday.
  const lastBuild = remaining + peakW;
  const longStart = seeded && h!.longestMi > 0 ? clamp(Math.round(h!.longestMi), D.longStart, Math.min(D.longCap, startMiles * 0.4 + 2)) : D.longStart;
  const longFinal = Math.max(longStart, Math.min(D.longCap, Math.round(peakMiles * 0.42)));
  const longGrowth = Math.min(D.longStep, (longFinal - longStart) / Math.max(1, lastBuild - 1));
  const longOf = (w: number, weekMiles: number): number => {
    const ph = phaseOf(w);
    if (ph === 'taper') {
      const k = w - lastBuild;
      const peakLong: number = longOf(lastBuild, periodization[lastBuild - 1]?.miles ?? weekMiles);
      return Math.round(peakLong * (k === taperW ? 0.4 : k === taperW - 1 ? 0.5 : 0.7));
    }
    let raw = Math.min(D.longCap, longStart + longGrowth * (w - 1), Math.max(D.longStart, weekMiles * 0.42));
    if (isCutback(w)) raw *= 0.75;
    else if (ph !== 'peak' && raw >= longFinal * 0.9 && w % 2 === 0) raw *= 0.8; // already long: alternate
    return Math.max(D.longStart, Math.round(raw));
  };

  // --- paces (sec / mi)
  const easyFromGoal = goal + 75;
  const easy = seeded && h!.avgPaceSec ? Math.max(easyFromGoal, h!.avgPaceSec - 10) : easyFromGoal;
  const long = easy - 10;
  const tempo = isMarathon ? goal - 20 : isHalf ? goal + 5 : goal + 25;
  const intervals = isMarathon ? goal - 50 : isHalf ? goal - 30 : goal - 10;

  // --- day templates: Mon rest · Tue Q1 · Wed easy · Thu Q2/easy · Fri rest · Sat long · Sun recovery
  const dropOrder: number[] = [6, 3, 2, 1]; // Sun recovery, Thu, Wed, Tue — dropped as run days shrink from 5 → 3
  const dropped = new Set<number>();
  for (let k = 0; k < 5 - runDays; k++) dropped.add(dropOrder[k]);

  const gels = (mi: number) => Math.max(2, Math.round(mi / 5));
  const sessions: PlanSession[] = [];
  periodization.forEach(({ week, phase, miles }) => {
    const monday = isoAdd(start, (week - 1) * 7);
    const isRaceWeek = week === total;
    const longMi = longOf(week, miles);
    const q1Mi = round(clamp(miles * 0.18, 4, D.tempoCap));
    const q2Mi = round(clamp(miles * 0.16, 4, D.tempoCap));
    const activeDays = [1, 2, 3, 5, 6].filter((d) => !dropped.has(d)).length + (runDays >= 6 ? 1 : 0) + (runDays >= 7 ? 1 : 0);
    // Easy days fill the remaining volume, but the long run stays the longest run of the week and an
    // easy day never runs past 8 mi (7 for 5K/10K) — extra volume goes to the marathon medium-long instead.
    const easyCap = isShort ? 7 : 8;
    const easyMi = round(Math.min(Math.max(3, longMi - 1.5), easyCap, Math.max(3, (miles - longMi - q1Mi - (dropped.has(3) ? 0 : q2Mi)) / Math.max(1, activeDays - 3))));
    const medLong = isMarathon && !dropped.has(2) && (phase === 'build' || phase === 'peak') ? round(Math.min(longMi - 2, Math.max(easyMi, easyMi * 1.4))) : easyMi;
    const variant = week % 3; // rotates the quality sessions

    for (let dow = 0; dow < 7; dow++) {
      // dow: 0 Mon … 6 Sun
      const date = isoAdd(monday, dow);
      const id = `${input.userId}-${date}`;
      const base = { id, date, payload: { phase, week } as PlanSession['payload'] };
      const push = (type: WorkoutType, title: string, detail: string, distanceMi: number, paceTarget?: string, zone?: string, fuel?: string, time = '7:00 AM') =>
        sessions.push({ ...base, type, title, detail, payload: { ...base.payload, distanceMi, paceTarget, zone, fuel, time } });
      const rest = (why: string) => push('rest', 'Rest', why, 0, undefined, undefined, undefined, undefined);
      const easyRun = (mi: number, title: string, detail: string, zone = 'Zone 2') => push('easy', title, detail, mi, range(easy - 15, easy + 15), zone, 'Water');

      if (isRaceWeek && date === input.race.date) {
        push('long', input.race.name, `Race day. Goal ${input.race.goalTime} at ${fmtPace(goal)} /mi. Trust the taper: easy first miles, fuel from the start.`, distMi, fmtPace(goal), 'Race', distMi >= 13 ? `${gels(distMi)} gels · 60 g/hr` : '30 g carbs pre');
        continue;
      }
      if (isRaceWeek && date > input.race.date) {
        rest('Recover. Walk, eat, sleep. No running this week.');
        continue;
      }
      if (date < today) {
        rest('Before your plan started.');
        continue;
      }
      if (isRaceWeek && date >= isoAdd(input.race.date, -1)) {
        rest('Rest. Tomorrow is the day — lay out your kit and eat a familiar dinner.');
        continue;
      }

      switch (dow) {
        case 0:
          if (runDays >= 7 && !isRaceWeek) push('recovery', `Recovery ${round(easyMi * 0.7)} mi`, 'Very easy. Conversational the whole way.', round(easyMi * 0.7), range(easy + 30, easy + 60), 'Zone 1–2', 'Water');
          else rest('Mondays are for recovery. Stretch, mobility, sleep.');
          break;
        case 1: {
          if (dropped.has(1)) { rest('Rest day.'); break; }
          if (isRaceWeek) easyRun(Math.min(4, q1Mi), `Easy ${Math.min(4, q1Mi)} mi + strides`, 'Short and sharp. 4 × 20 s strides to remind the legs.');
          else if (phase === 'base') easyRun(q1Mi, `Easy ${q1Mi} mi + strides`, 'Easy pace, then 6 × 20 s strides to finish. Building the engine, not testing it.');
          else if (phase === 'build') {
            const work = Math.max(2, q1Mi - 2);
            if (variant === 1) push('tempo', `Cruise intervals ${q1Mi} mi`, `1 mi easy · ${Math.max(2, Math.round(work / 1.5))} × 1.5 mi at ${fmtPace(tempo)} (2 min jog) · 1 mi easy.`, q1Mi, fmtPace(tempo), 'Zone 3–4', '60–90 g pre');
            else push('tempo', `Tempo ${q1Mi} mi`, `1 mi easy · ${work} mi at ${fmtPace(tempo)} · 1 mi easy. Comfortably hard, controlled.`, q1Mi, fmtPace(tempo), 'Zone 3–4', '60–90 g pre');
          } else if (phase === 'peak') {
            const sets = isShort ? ['8 × 400 m (200 jog)', '5 × 800 m (400 jog)', '4 × 1000 m (400 jog)'] : ['6 × 800 m (400 jog)', '5 × 1000 m (400 jog)', '4 × 1200 m (400 jog)'];
            push('intervals', 'Intervals', `2 mi warm-up · ${sets[variant]} at ${fmtPace(intervals)} · 1 mi cool-down.`, q1Mi, fmtPace(intervals), 'Zone 4–5', '60–90 g pre');
          } else {
            const mi = round(q1Mi * 0.7);
            push('tempo', `Tempo ${mi} mi`, `Short tempo to stay sharp: ${Math.max(2, mi - 2)} mi at ${fmtPace(tempo)}. Nothing heroic.`, mi, fmtPace(tempo), 'Zone 3', '30 g pre');
          }
          break;
        }
        case 2:
          if (dropped.has(2)) rest('Rest day.');
          else if (isRaceWeek) easyRun(Math.min(3, easyMi), `Easy ${Math.min(3, easyMi)} mi`, 'Loosen up. Keep it short.');
          else if (medLong > easyMi) push('easy', `Medium-long ${medLong} mi`, 'Steady and relaxed — the midweek volume that makes marathon fitness.', medLong, range(easy - 15, easy + 15), 'Zone 2', medLong >= 8 ? '30 g carbs / hr' : 'Water');
          else easyRun(easyMi, `Easy ${easyMi} mi`, 'Conversational pace. This is where the fitness quietly accrues.');
          break;
        case 3: {
          if (dropped.has(3)) { rest('Rest day.'); break; }
          if (isRaceWeek) easyRun(2, 'Shake-out 2 mi', 'Two easy miles and 4 strides. Then feet up.');
          else if (phase === 'peak') push('tempo', `Tempo ${q2Mi} mi`, `1 mi easy · ${Math.max(2, q2Mi - 2)} mi at ${fmtPace(tempo)} · 1 mi easy.`, q2Mi, fmtPace(tempo), 'Zone 3–4', '60–90 g pre');
          else if (phase === 'build') {
            const menu = [
              ['Hills', `Warm up · 8 × 60 s uphill hard, jog down · cool down. Strength you'll feel in the last miles.`],
              ['Intervals', `Warm up · 10 × 400 m at ${fmtPace(intervals)} (200 jog) · cool down.`],
              ['Intervals', `Warm up · 6 × 800 m at ${fmtPace(intervals)} (400 jog) · cool down.`],
            ][variant];
            push('intervals', menu[0], menu[1], q2Mi, fmtPace(intervals), 'Zone 4', '60–90 g pre');
          } else if (phase === 'base' && variant === 2) easyRun(easyMi, `Easy ${easyMi} mi + hills`, 'Easy, then 6 × 30 s hill strides. Walk down between.');
          else easyRun(easyMi, `Easy ${easyMi} mi`, 'Keep it easy. Add 4 strides if you feel good.');
          break;
        }
        case 4:
          if (runDays >= 6 && !isRaceWeek) easyRun(round(easyMi * 0.8), `Easy ${round(easyMi * 0.8)} mi`, 'Shake-out before the long run.');
          else rest(isRaceWeek ? 'Rest. Eat normally, hydrate, sleep early.' : 'Rest before the long run. Carb up tonight.');
          break;
        case 5:
          if (isRaceWeek) easyRun(2, 'Shake-out 2 mi', 'Two easy miles, a few strides. Lay out your kit.', 'Zone 1–2');
          else if (phase === 'peak' && (isMarathon || isHalf)) {
            const gp = Math.round(longMi * (isMarathon ? 0.3 : 0.4));
            push('long', `Long run ${longMi} mi`, `Easy for ${longMi - gp} mi, then the last ${gp} mi at goal pace ${fmtPace(goal)}. Practise race-day breakfast and gels.`, longMi, range(long - 15, long + 15), 'Zone 2–3', `${gels(longMi)} gels · 60 g/hr`);
          } else if (phase === 'build' && variant === 0 && longMi >= 8) {
            push('long', `Long run ${longMi} mi`, `Steady, then pick it up over the last 3 mi to ${fmtPace(long - 30)}. Fuel from the first 30 minutes.`, longMi, range(long - 15, long + 15), 'Zone 2', `${gels(longMi)} gels · 60 g/hr`);
          } else push('long', `Long run ${longMi} mi`, isCutback(week) ? 'Cutback week: shorter on purpose. Enjoy it.' : 'Steady and relaxed. Practise race-day fueling.', longMi, range(long - 15, long + 15), 'Zone 2', longMi >= 8 ? `${gels(longMi)} gels · 30–60 g/hr` : 'Water');
          break;
        case 6:
          if (dropped.has(6) || isRaceWeek) rest(isRaceWeek ? 'Rest. Tomorrow is the day.' : 'Rest day.');
          else push('recovery', `Recovery ${round(easyMi * 0.7)} mi`, 'Legs will be heavy. Slow is the point.', round(easyMi * 0.7), range(easy + 30, easy + 60), 'Zone 1', 'Water');
          break;
      }
    }
  });

  const weekIdx = clamp(Math.floor((new Date(today + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()) / 604800000) + 1, 1, total);
  return {
    label: `${dist === 'Half' ? 'Half marathon' : dist} block`,
    total_weeks: total,
    week: weekIdx,
    phase: phaseOf(weekIdx),
    periodization,
    sessions,
    seed,
  };
}

// ---------------------------------------------------------------- sessions → what the screens show

/** One planned session as a calendar day. */
export function toDayPlan(s: PlanSession): DayPlan {
  const p = s.payload;
  return {
    dow: dowOf(s.date),
    date: Number(s.date.slice(8, 10)),
    iso: s.date,
    type: s.type,
    title: s.title,
    miles: p.distanceMi ?? 0,
    pace: p.paceTarget,
    effort: p.zone,
    note: s.detail,
    fuel: p.fuel,
    time: p.time,
  };
}

/** An empty day, for dates outside the block. */
export function emptyDay(iso: string): DayPlan {
  return { dow: dowOf(iso), date: Number(iso.slice(8, 10)), iso, type: 'rest', title: 'Rest', miles: 0, note: 'Nothing planned. Rest or easy movement.' };
}

/** The Monday-first week containing `today`, cut from the whole-block calendar. */
export function weekFromPlan(plan: DayPlan[], today = localISO()): { week: DayPlan[]; todayIndex: number } {
  const monday = mondayOf(today);
  const byIso = new Map(plan.map((d) => [d.iso, d]));
  const week = Array.from({ length: 7 }, (_, i) => {
    const iso = isoAdd(monday, i);
    return byIso.get(iso) ?? emptyDay(iso);
  });
  return { week, todayIndex: (new Date(today + 'T00:00:00').getDay() + 6) % 7 };
}

/** Which block week (1-based) `today` falls in, given the block's first day. */
export function blockWeekOf(firstIso: string, totalWeeks: number, today = localISO()) {
  const w = Math.floor((new Date(today + 'T00:00:00').getTime() - new Date(mondayOf(firstIso) + 'T00:00:00').getTime()) / 604800000) + 1;
  return clamp(w, 1, Math.max(1, totalWeeks));
}

/** Plain-English summary of what the plan was built from, for the preview and the Plan tab. */
export function seedSummary(seed: PlanSeed | undefined, distance: Race['distance']) {
  if (!seed || seed.source !== 'history') {
    return {
      title: 'Built from the defaults',
      body: `No synced runs to go on, so this ${distance === 'Half' ? 'half marathon' : distance} block starts from a conservative base. Connect Strava and it re-seeds from your real mileage.`,
    };
  }
  const pace = seed.avgPaceSec ? ` at ${fmtPace(seed.avgPaceSec)} /mi` : '';
  const gap = seed.goalGapSec;
  const goalNote =
    gap == null ? ''
    : gap > 90 ? ' Your goal is well ahead of what recent runs suggest — workouts are set from the goal, so expect the first weeks to feel hard.'
    : gap > 30 ? ' Your goal is a stretch from current fitness, which is exactly what a block is for.'
    : gap < -30 ? ' Recent runs suggest this goal is comfortable — you may have a faster one in you.'
    : ' Your goal lines up with your recent running.';
  return {
    title: 'Built from your Strava history',
    body: `${seed.runs} runs in the last 12 weeks: ${seed.weeklyAvg} mi/wk on average${pace}, longest ${seed.longestMi} mi. That set your starting volume, first long run and easy pace.${goalNote}`,
  };
}
