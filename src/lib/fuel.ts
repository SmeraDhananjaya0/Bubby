/**
 * The fuel engine, v0.1.
 *
 * Every day's calorie target is two explainable pieces:
 *   baseline  — what the body needs on a day with no running (Mifflin-St Jeor resting rate × 1.35
 *               for ordinary daily living), and
 *   run cost  — what the planned run itself burns: ~0.63 kcal per pound of bodyweight per mile
 *               (the net cost of running, ACSM), nudged up for hard sessions.
 * So a 3-mile easy day adds a few hundred calories; a 20-mile long run adds close to two thousand.
 * Carbs scale with the day's load, protein holds steady, fat fills what's left.
 *
 * `supabase/functions/strava-sync` carries a copy of these constants — change both or neither.
 */
import type { DayPlan, Macros, Profile, WorkoutType } from '@/types';

const KG_PER_LB = 0.4536;

/** Net running cost, kcal per lb per mile, by session type (intensity + a little after-burn). */
export const KCAL_PER_LB_MILE: Record<WorkoutType, number> = {
  rest: 0,
  recovery: 0.6,
  easy: 0.63,
  long: 0.63,
  tempo: 0.68,
  intervals: 0.72,
};

/** Grams of carbs per kg bodyweight by workout type (sports-nutrition consensus ranges). */
const CARBS_PER_KG: Record<WorkoutType, number> = {
  rest: 3.5,
  recovery: 4.5,
  easy: 5,
  tempo: 6,
  intervals: 6,
  long: 6.5,
};

const DAILY_LIVING = 1.35;
const PROTEIN_PER_KG = 1.8;
const FAT_FLOOR_PER_KG = 0.8;

export function weightKg(profile: Profile) {
  return profile.weightLb * KG_PER_LB;
}

/** Resting + daily-living baseline, before any running. */
export function baselineKcal(profile: Profile) {
  const kg = weightKg(profile);
  const cm = profile.heightIn * 2.54;
  const sexTerm = profile.sex === 'Female' ? -161 : 5;
  const bmr = 10 * kg + 6.25 * cm - 5 * profile.age + sexTerm;
  return Math.round((bmr * DAILY_LIVING) / 10) * 10;
}

/** What the planned run burns on top of the baseline. */
export function runKcal(profile: Profile, type: WorkoutType, miles: number) {
  return Math.round((profile.weightLb * KCAL_PER_LB_MILE[type] * Math.max(0, miles)) / 10) * 10;
}

/** The two halves of today's calorie target, for "why" copy. */
export function fuelBreakdown(day: Pick<DayPlan, 'type' | 'miles'>, profile: Profile) {
  const base = baselineKcal(profile);
  const run = runKcal(profile, day.type, day.miles);
  return { base, run, total: base + run };
}

/** Daily targets for one planned day. */
export function targetsFor(day: Pick<DayPlan, 'type' | 'miles'>, profile: Profile): Macros {
  const kg = weightKg(profile);
  const kcal = fuelBreakdown(day, profile).total;
  const protein = Math.round((kg * PROTEIN_PER_KG) / 5) * 5;
  // Long runs past 10 miles need more than the flat rate, up to 8 g/kg.
  const carbsPerKg = day.type === 'long' ? Math.min(8, CARBS_PER_KG.long + Math.max(0, day.miles - 10) * 0.15) : CARBS_PER_KG[day.type];
  const carbs = Math.round((kg * carbsPerKg) / 5) * 5;
  const fat = Math.round(Math.max(kg * FAT_FLOOR_PER_KG, (kcal - carbs * 4 - protein * 4) / 9));
  return { kcal, carbs, protein, fat };
}

/** Before / during / after fueling protocol for a run. */
export function protocolFor(day: DayPlan) {
  if (day.type === 'rest') return null;
  const long = day.type === 'long';
  const hard = day.type === 'tempo' || day.type === 'intervals';
  return {
    before: long || hard ? '60–90 g carbs' : '20–30 g carbs',
    during: long ? '30–60 g carbs / hr' : day.miles >= 8 ? '30 g carbs / hr' : 'Water',
    after: long || hard ? '+30 g protein' : 'Normal meal',
    carry: long
      ? [`${Math.max(2, Math.round(day.miles / 5))} × gel · ${Math.max(2, Math.round(day.miles / 5)) * 25} g carbs`, '500 ml electrolyte drink', '1 salt tab']
      : hard
        ? ['1 gel before the work', '500 ml water']
        : [],
    timing: long ? "First gel at 35 min, then one every 35 min. Sip the drink from the start, not when you're thirsty." : undefined,
  };
}

export function sum(meals: Macros[]): Macros {
  return meals.reduce(
    (s, m) => ({ kcal: s.kcal + m.kcal, carbs: s.carbs + m.carbs, protein: s.protein + m.protein, fat: s.fat + m.fat }),
    { kcal: 0, carbs: 0, protein: 0, fat: 0 },
  );
}

export function pct(v: number, goal: number) {
  return Math.min(100, Math.round((v / goal) * 100));
}
