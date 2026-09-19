/**
 * The fuel engine, v0.
 *
 * Calories and carbs follow the day's training load; protein stays steady.
 * This is deliberately simple and transparent so it can be tuned against real
 * logs. Every number the UI shows for "targets" should come from here.
 */
import type { DayPlan, Macros, Profile, WorkoutType } from '@/types';

const KG_PER_LB = 0.4536;

/** Grams of carbs per kg bodyweight by workout type (sports-nutrition consensus ranges). */
const CARBS_PER_KG: Record<WorkoutType, number> = {
  rest: 3.4,
  recovery: 4.1,
  easy: 4.5,
  tempo: 5.5,
  intervals: 5.2,
  long: 6.6,
};

/** Extra calories per mile, by intensity. */
const KCAL_PER_MILE: Record<WorkoutType, number> = {
  rest: 0,
  recovery: 75,
  easy: 70,
  tempo: 93,
  intervals: 75,
  long: 69,
};

export function weightKg(profile: Profile) {
  return profile.weightLb * KG_PER_LB;
}

/** Resting + daily-living baseline, before running. Mifflin-St Jeor × 1.4. */
export function baselineKcal(profile: Profile) {
  const kg = weightKg(profile);
  const cm = profile.heightIn * 2.54;
  const sexTerm = profile.sex === 'Female' ? -161 : 5;
  const bmr = 10 * kg + 6.25 * cm - 5 * profile.age + sexTerm;
  return Math.round((bmr * 1.4) / 50) * 50;
}

/** Daily targets for one planned day. */
export function targetsFor(day: DayPlan, profile: Profile): Macros {
  const kg = weightKg(profile);
  const kcal = baselineKcal(profile) + Math.round(day.miles * KCAL_PER_MILE[day.type]);
  const protein = Math.round((kg * 1.8) / 5) * 5;
  const carbs = Math.round((kg * CARBS_PER_KG[day.type]) / 5) * 5;
  const fat = Math.max(50, Math.round((kcal * 0.25) / 9));
  return { kcal: Math.round(kcal / 50) * 50, carbs, protein, fat };
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
