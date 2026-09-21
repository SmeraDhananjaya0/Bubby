/**
 * Sample data — mirrors the numbers on the design canvas so the running app
 * looks exactly like the wireframe. Replace piece by piece with real data
 * (Strava / HealthKit / the fuel engine) as integrations land.
 */
import type { DayPlan, FoodOption, Meal, Profile, Race, RunFuel, Supplement } from '@/types';

export const sampleRace: Race = {
  name: 'Honolulu Marathon',
  distance: 'Marathon',
  miles: 26.2,
  date: '2026-12-06',
  goalTime: '3:45:00',
  mode: 'time',
  totalWeeks: 11,
  currentWeek: 6,
  phase: 'Build',
};

export const sampleProfile: Profile = {
  age: 29,
  sex: '',
  heightIn: 69,
  weightLb: 160,
  diet: '',
  runDaysPerWeek: 5,
  level: 'intermediate',
};

/** Monday-first week. Saturday (index 5) is "today" in the sample. */
export const sampleWeek: DayPlan[] = [
  { dow: 'Mon', date: 14, type: 'rest', title: 'Rest', miles: 0, note: 'Low day. Calories drop, protein holds at 130 g.' },
  { dow: 'Tue', date: 15, type: 'intervals', title: 'Intervals', miles: 8, pace: '7:55–8:05', effort: 'Zone 4', fuel: '20 g pre', time: '6:30 AM', note: '6 × 800 m. Carbs up before the session, +30 g protein after.', done: '8.0 mi · 1:06:10 · 8:16 /mi' },
  { dow: 'Wed', date: 16, type: 'easy', title: 'Easy', miles: 5, pace: '9:15–9:45', effort: 'Zone 2', fuel: 'Water', time: '6:30 AM', note: 'Conversational. Normal meals, no extra fueling.', done: '5.1 mi · 47:05 · 9:14 /mi' },
  { dow: 'Thu', date: 17, type: 'tempo', title: 'Tempo', miles: 7, pace: '7:55–8:05', effort: 'Zone 3–4', fuel: '60–90 g pre', time: '6:30 AM', note: '3 mi at threshold. 60–90 g carbs in the two hours before.', done: '7.0 mi · 58:40 · 8:23 /mi' },
  { dow: 'Fri', date: 18, type: 'rest', title: 'Rest', miles: 0, note: 'Low day. Calories drop, protein holds at 130 g.' },
  { dow: 'Sat', date: 19, type: 'long', title: 'Long', miles: 16, pace: '9:10–9:40', effort: 'Zone 2', fuel: '60 g / hr', time: '7:00 AM', note: 'Steady from the first mile. Practice race-day breakfast, then a gel every 35 minutes.' },
  { dow: 'Sun', date: 20, type: 'recovery', title: 'Recovery', miles: 4, pace: '9:30–10:00', effort: 'Zone 1', fuel: 'Water', time: '8:00 AM', note: 'Very easy. Rebuild glycogen with normal meals.' },
];

export const sampleTodayIndex = 5;

/** Weekly mileage for the whole block, Base → Build → Peak → Taper. */
export const sampleBlockMiles = [22, 25, 28, 31, 35, 38, 42, 45, 32, 24, 14];
export const sampleBlockPhases: Array<'base' | 'build' | 'peak' | 'taper'> = [
  'base', 'base', 'build', 'build', 'build', 'build', 'peak', 'peak', 'taper', 'taper', 'taper',
];

/** Last 12 weeks of Strava mileage (onboarding "You're connected"). */
export const sampleHistoryMiles = [18, 22, 15, 24, 27, 20, 28, 30, 24, 32, 34, 36];

/** Trend chart series for the no-race home. */
export const sampleTrend = {
  '4W': [28.0, 25.0, 21.9, 24.6],
  '12W': [16.5, 18.0, 21.0, 19.5, 24.0, 22.0, 26.0, 23.5, 28.0, 25.0, 21.9, 24.6],
  '6M': [10, 12, 14, 13.5, 15, 17, 16, 18.5, 20, 19, 22, 21, 12, 15.5, 16.5, 18, 21, 19.5, 24, 22, 26, 23.5, 28, 25, 21.9, 24.6],
};

export const sampleThisWeekNoRace = [5.2, 6.4, 0, 7.1, 0, 5.9, 0];
export const sampleLastWeekNoRace = [4.8, 5.5, 0, 6.2, 5.4, 0, 0];

export const samplePersonalBests = [
  { label: '5K', time: '22:48', when: 'Jun 2026' },
  { label: '10K', time: '47:31', when: 'Aug 2026' },
  { label: 'Half', time: '1:46:12', when: 'Mar 2026' },
];

export const sampleMeals: Meal[] = [
  { id: 'm1', name: 'Breakfast', desc: 'Oats, banana, honey', time: '7:10 AM', kcal: 640, carbs: 96, protein: 14, fat: 16 },
  { id: 'm2', name: 'Mid-run fuel', desc: '3 gels', time: '8:20 AM', kcal: 300, carbs: 75, protein: 0, fat: 0 },
  { id: 'm3', name: 'Lunch', desc: 'Rice bowl, chicken, greens', time: '12:40 PM', kcal: 820, carbs: 100, protein: 36, fat: 22 },
  { id: 'm4', name: 'Post-run', desc: 'Recovery shake, banana', time: '10:05 AM', kcal: 400, carbs: 39, protein: 20, fat: 2 },
];

export const dinnerOptions: FoodOption[] = [
  { name: 'Salmon, rice & greens', kcal: 720, carbs: 78, protein: 42, fat: 22 },
  { name: 'Pasta with chicken', kcal: 840, carbs: 110, protein: 45, fat: 20 },
  { name: 'Tofu stir-fry bowl', kcal: 650, carbs: 82, protein: 30, fat: 18 },
  { name: 'Burrito bowl', kcal: 780, carbs: 90, protein: 40, fat: 26 },
];

export const quickFoods: FoodOption[] = [
  { name: 'Banana', kcal: 105, carbs: 27, protein: 1, fat: 0 },
  { name: 'Oatmeal bowl', kcal: 300, carbs: 54, protein: 10, fat: 5 },
  { name: 'Bagel & peanut butter', kcal: 420, carbs: 56, protein: 14, fat: 16 },
  { name: 'Salmon & rice', kcal: 640, carbs: 70, protein: 38, fat: 20 },
  { name: 'Sweet potato', kcal: 180, carbs: 41, protein: 4, fat: 0 },
  { name: 'Recovery shake', kcal: 400, carbs: 51, protein: 26, fat: 10 },
  { name: 'Trail mix', kcal: 280, carbs: 22, protein: 8, fat: 19 },
  { name: 'Electrolyte drink', kcal: 80, carbs: 20, protein: 0, fat: 0 },
];

export const runFuels: RunFuel[] = [
  { label: 'Gel', sub: '25 g', kcal: 100, carbs: 25 },
  { label: 'Chews', sub: '22 g', kcal: 90, carbs: 22 },
  { label: 'Sports drink', sub: '500 ml', kcal: 120, carbs: 30 },
  { label: 'Salt tab', sub: '300 mg Na', kcal: 0, carbs: 0 },
];

export const supplements: Supplement[] = [
  { name: 'Creatine', dose: '5 g', why: 'Repeated hard efforts, faster recovery' },
  { name: 'Vitamin D', dose: '2,000 IU', why: 'Bone and immunity, low in winter' },
  { name: 'Electrolytes', dose: '1 tab', why: 'Long-run and hot days' },
  { name: 'Omega-3', dose: '1 g', why: 'Joints and heart' },
  { name: 'Iron', dose: '18 mg', why: 'Only if ferritin is low' },
];

export const sampleMicros = [
  { name: 'Iron', val: 9, goal: 18, unit: 'mg', hue: 'accent' as const },
  { name: 'Sodium', val: 1.8, goal: 3.5, unit: 'g', hue: 'sky' as const },
  { name: 'Potassium', val: 2.1, goal: 3.4, unit: 'g', hue: 'violet' as const },
  { name: 'Calcium', val: 700, goal: 1000, unit: 'mg', hue: 'teal' as const },
  { name: 'Vitamin D', val: 8, goal: 15, unit: 'µg', hue: 'amber' as const },
];

export const sampleRecovery = { score: 82, label: 'Ready to train', sleep: '7h 42m', hrv: 68, rhr: 49 };

export const sampleStravaStats = { runsSynced: 214, weeklyAvg: 28, restingHr: 52, maxHr: 188, threshold: '7:55' };

export const samplePlanUpdate = {
  run: { title: 'Tempo run', miles: 8.2, planned: 'Easy · 5 mi', avgHr: 162, plannedHr: 140, zone4Min: 34 },
  added: { kcal: 520, carbs: 95, sodiumMg: 600 },
  moved: { from: 'Thu · Tempo 7 mi', to: 'Thu · Easy 5 mi', why: "Thursday's tempo moves to Friday so you don't stack two hard days back to back." },
};

export const sampleRecap = { eaten: 2200, goal: 3100, carbs: 260, carbsGoal: 420 };

export const coachChanges = [
  { day: 'Sat', from: 'Long run 16 mi', to: 'Rest' },
  { day: 'Sun', from: 'Recovery 4 mi', to: 'Rest' },
  { day: 'Tue', from: 'Intervals', to: 'Rest' },
  { day: 'Wed', from: 'Easy 5 mi', to: 'Easy 3 mi, if pain-free' },
  { day: 'Sat', from: 'Long run 18 mi', to: '14 mi' },
  { day: 'Fuel', from: '3,400 kcal today', to: '2,300 · protein stays 130 g' },
];
