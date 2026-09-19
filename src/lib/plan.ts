/**
 * Plan builder v0 — turns a goal race + profile into a periodized block of daily sessions.
 *
 * Pure and deterministic (same inputs → same plan) so it can run on the client at onboarding,
 * in an edge function later, or in a test. The output shape is exactly what `planned_sessions`
 * and `blocks` store, so `repo.savePlan()` is a straight insert.
 *
 * Model (kept deliberately explainable — the coach has to be able to say *why*):
 *  - Block length: weeks until race day (1–30).
 *  - Phases: taper (3 wks marathon / 2 half / 1 shorter) at the end, peak (3 wks) before it,
 *    the rest split ~45% base / 55% build.
 *  - Weekly miles ramp linearly from the runner's current volume to a peak, with every 4th week
 *    a 20% cutback; taper steps down 75% → 55% → race week.
 *  - Week shape by run days/week: Mon rest · Tue quality · Wed easy · Thu quality/easy · Fri rest ·
 *    Sat long · Sun recovery. Fewer run days drop recovery, then Thu, then Wed.
 *  - Paces derive from goal pace: easy +75s, long +60s, tempo −20s (marathon) / +5s (half),
 *    intervals −50s (marathon) / −30s (half).
 */
import type { Profile, Race, WorkoutType } from '@/types';

export type PlanSession = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: WorkoutType;
  detail: string;
  payload: { distanceMi: number; paceTarget?: string; zone?: string; time?: string; phase: Phase; week: number };
};

export type Phase = 'base' | 'build' | 'peak' | 'taper';

export type PlanBlock = {
  label: string;
  total_weeks: number;
  week: number; // 1-based, the week containing `today`
  phase: Phase;
  periodization: { week: number; phase: Phase; miles: number }[];
  sessions: PlanSession[];
};

const DIST_MI: Record<Race['distance'], number> = { '5K': 3.1, '10K': 6.2, Half: 13.1, Marathon: 26.2 };

export function parseGoalSeconds(goalTime: string): number {
  const p = goalTime.split(':').map((x) => Number(x) || 0);
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : p[0];
}

export const fmtPace = (secPerMi: number) => {
  const s = Math.max(240, Math.round(secPerMi));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const range = (a: number, b: number) => `${fmtPace(a)}–${fmtPace(b)}`;

const isoAdd = (iso: string, days: number) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-CA');
};
const mondayOf = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return isoAdd(iso, -((d.getDay() + 6) % 7));
};
const round = (x: number, step = 0.5) => Math.round(x / step) * step;

export type PlanInput = {
  userId: string;
  race: Pick<Race, 'name' | 'distance' | 'date' | 'goalTime'>;
  profile: Pick<Profile, 'runDaysPerWeek'>;
  /** Current weekly volume in miles (from Strava history if we have it). */
  currentWeeklyMiles?: number;
  /** ISO date for "today"; defaults to the local date. */
  today?: string;
};

export function buildPlan(input: PlanInput): PlanBlock {
  const today = input.today ?? new Date().toLocaleDateString('en-CA');
  const dist = input.race.distance;
  const distMi = DIST_MI[dist];
  const isMarathon = dist === 'Marathon';
  const isHalf = dist === 'Half';
  const runDays = Math.min(7, Math.max(3, input.profile.runDaysPerWeek || 5));

  // --- block length & phases
  const start = mondayOf(today);
  const raceMonday = mondayOf(input.race.date);
  const rawWeeks = Math.round((new Date(raceMonday).getTime() - new Date(start).getTime()) / 604800000) + 1;
  // 1–30 weeks: a short runway gives an honest short plan; a long one gets extra base weeks.
  const total = Math.min(30, Math.max(1, rawWeeks));
  const taperW = Math.min(isMarathon ? 3 : isHalf ? 2 : 1, Math.max(0, total - 1));
  const peakW = Math.max(0, Math.min(3, total - taperW - 2));
  const remaining = Math.max(0, total - taperW - peakW);
  const baseW = Math.max(remaining > 0 ? 1 : 0, Math.round(remaining * 0.45));
  const phaseOf = (w: number): Phase => (w <= baseW ? 'base' : w <= remaining ? 'build' : w <= remaining + peakW ? 'peak' : 'taper');

  // --- weekly volume
  const startMiles = Math.max(10, input.currentWeeklyMiles ?? (isMarathon ? 25 : isHalf ? 18 : 12));
  const peakMiles = isMarathon ? Math.min(55, Math.max(40, startMiles * 1.5)) : isHalf ? Math.min(40, Math.max(28, startMiles * 1.4)) : Math.min(30, Math.max(20, startMiles * 1.3));
  const rampWeeks = Math.max(1, remaining + peakW - 1);
  const periodization = Array.from({ length: total }, (_, i) => {
    const w = i + 1;
    const ph = phaseOf(w);
    let miles: number;
    if (ph === 'taper') {
      const k = w - (remaining + peakW); // 1..taperW
      miles = peakMiles * (k === taperW ? 0.35 : k === taperW - 1 ? 0.55 : 0.75);
    } else {
      miles = startMiles + ((peakMiles - startMiles) * (w - 1)) / Math.max(1, rampWeeks);
      if (w % 4 === 0 && ph !== 'peak') miles *= 0.8; // cutback week
    }
    return { week: w, phase: ph, miles: Math.round(miles) };
  });

  // --- paces (sec / mi)
  const goal = parseGoalSeconds(input.race.goalTime) / distMi;
  const easy = goal + 75;
  const long = goal + 60;
  const tempo = isMarathon ? goal - 20 : isHalf ? goal + 5 : goal + 25;
  const intervals = isMarathon ? goal - 50 : isHalf ? goal - 30 : goal - 10;

  // --- day templates: Mon rest · Tue Q1 · Wed easy · Thu Q2/easy · Fri rest · Sat long · Sun recovery
  const dropOrder: number[] = [6, 3, 2, 1]; // Sun recovery, Thu, Wed, Tue — dropped as run days shrink from 7 → 3
  const dropped = new Set<number>();
  // 7 days → run every day (Mon & Fri become easy); 6 → Fri rest; 5 → Mon+Fri rest; then drop per order
  for (let k = 0; k < 5 - runDays; k++) dropped.add(dropOrder[k]);

  const sessions: PlanSession[] = [];
  periodization.forEach(({ week, phase, miles }) => {
    const monday = isoAdd(start, (week - 1) * 7);
    const isRaceWeek = week === total;
    const longMi = round(Math.min(isMarathon ? 20 : isHalf ? 14 : 9, Math.max(isMarathon ? 8 : 5, miles * (isMarathon ? 0.34 : isHalf ? 0.36 : 0.3))));
    const q1Mi = round(Math.min(8, Math.max(4, miles * 0.17)));
    const q2Mi = round(Math.min(8, Math.max(4, miles * 0.16)));
    const activeDays = [1, 2, 3, 5, 6].filter((d) => !dropped.has(d)).length + (runDays >= 6 ? 1 : 0) + (runDays >= 7 ? 1 : 0);
    // Easy days fill the remaining volume, but the long run stays the longest run of the week.
    const easyMi = round(Math.min(Math.max(3, longMi - 1.5), Math.max(3, (miles - longMi - q1Mi - (dropped.has(3) ? 0 : q2Mi)) / Math.max(1, activeDays - 3))));

    for (let dow = 0; dow < 7; dow++) {
      // dow: 0 Mon … 6 Sun
      const date = isoAdd(monday, dow);
      const id = `${input.userId}-${date}`;
      const base = { id, date, payload: { phase, week } as PlanSession['payload'] };
      const push = (type: WorkoutType, title: string, detail: string, distanceMi: number, paceTarget?: string, zone?: string, time = '7:00 AM') =>
        sessions.push({ ...base, type, title, detail, payload: { ...base.payload, distanceMi, paceTarget, zone, time } });
      const rest = (why: string) => push('rest', 'Rest', why, 0, undefined, undefined, undefined);

      if (isRaceWeek && date === input.race.date) {
        push('long', `${input.race.name}`, `Race day. Goal ${input.race.goalTime}. Trust the taper.`, distMi, fmtPace(goal), 'Race', '7:00 AM');
        continue;
      }
      if (isRaceWeek && date > input.race.date) {
        rest('Recover. Walk, eat, sleep.');
        continue;
      }
      if (date < today) {
        // Past days in the first week: mark as not planned.
        rest('Before your plan started.');
        continue;
      }

      switch (dow) {
        case 0:
          if (runDays >= 7) push('recovery', `Recovery ${round(easyMi * 0.7)} mi`, 'Very easy. Conversational the whole way.', round(easyMi * 0.7), range(easy + 30, easy + 60), 'Zone 1–2');
          else rest('Mondays are for recovery. Stretch, mobility, sleep.');
          break;
        case 1: {
          if (dropped.has(1)) { rest('Rest day.'); break; }
          if (phase === 'base' || isRaceWeek) push('easy', `Easy ${q1Mi} mi + strides`, isRaceWeek ? 'Short and sharp. 4 × 20s strides.' : 'Easy pace, then 6 × 20s strides to finish.', q1Mi, range(easy - 15, easy + 15), 'Zone 2');
          else if (phase === 'build') push('tempo', `Tempo ${q1Mi} mi`, `1 mi easy · ${Math.max(2, q1Mi - 2)} mi at tempo · 1 mi easy.`, q1Mi, fmtPace(tempo), 'Zone 3–4');
          else if (phase === 'peak') push('intervals', 'Intervals', isMarathon ? `2 mi warm-up · 6 × 800 m at ${fmtPace(intervals)} (400 jog) · 1 mi cool-down.` : `2 mi warm-up · 5 × 1000 m at ${fmtPace(intervals)} (400 jog) · 1 mi cool-down.`, q1Mi, fmtPace(intervals), 'Zone 4–5');
          else push('tempo', `Tempo ${round(q1Mi * 0.7)} mi`, `Short tempo to stay sharp: ${Math.max(2, round(q1Mi * 0.7) - 2)} mi at goal effort.`, round(q1Mi * 0.7), fmtPace(tempo), 'Zone 3');
          break;
        }
        case 2:
          if (dropped.has(2)) rest('Rest day.');
          else push('easy', `Easy ${easyMi} mi`, 'Conversational pace. This is where the fitness quietly accrues.', easyMi, range(easy - 15, easy + 15), 'Zone 2');
          break;
        case 3: {
          if (dropped.has(3)) { rest('Rest day.'); break; }
          if (phase === 'peak') push('tempo', `Tempo ${q2Mi} mi`, `1 mi easy · ${Math.max(2, q2Mi - 2)} mi at ${fmtPace(tempo)} · 1 mi easy.`, q2Mi, fmtPace(tempo), 'Zone 3–4');
          else if (phase === 'build') push('intervals', 'Hills or intervals', `Warm up · 8 × 60s hill or 400 m at ${fmtPace(intervals)} · cool down.`, q2Mi, fmtPace(intervals), 'Zone 4');
          else push('easy', `Easy ${easyMi} mi`, 'Keep it easy. Add 4 strides if you feel good.', easyMi, range(easy - 15, easy + 15), 'Zone 2');
          break;
        }
        case 4:
          if (runDays >= 6) push('easy', `Easy ${round(easyMi * 0.8)} mi`, 'Shake-out before the long run.', round(easyMi * 0.8), range(easy, easy + 30), 'Zone 2');
          else rest('Rest before the long run. Carb up tonight.');
          break;
        case 5:
          if (isRaceWeek) push('easy', 'Shake-out 2 mi', 'Two easy miles, a few strides. Lay out your kit.', 2, range(easy, easy + 30), 'Zone 1–2');
          else push('long', `Long run ${longMi} mi`, phase === 'peak' && isMarathon ? `Last ${Math.round(longMi * 0.3)} mi at goal pace ${fmtPace(goal)}.` : 'Steady and relaxed. Practise race-day fueling.', longMi, range(long - 15, long + 15), 'Zone 2', '7:00 AM');
          break;
        case 6:
          if (dropped.has(6) || isRaceWeek) rest(isRaceWeek ? 'Rest. Tomorrow is the day.' : 'Rest day.');
          else push('recovery', `Recovery ${round(easyMi * 0.7)} mi`, 'Legs will be heavy. Slow is the point.', round(easyMi * 0.7), range(easy + 30, easy + 60), 'Zone 1');
          break;
      }
    }
  });

  const weekIdx = Math.min(total, Math.max(1, Math.floor((new Date(today).getTime() - new Date(start).getTime()) / 604800000) + 1));
  return {
    label: `${dist === 'Half' ? 'Half marathon' : dist} block`,
    total_weeks: total,
    week: weekIdx,
    phase: phaseOf(weekIdx),
    periodization,
    sessions,
  };
}
