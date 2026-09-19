/**
 * App state — one zustand store, no persistence yet (see CLAUDE.md → Roadmap).
 * Screens read from here; the fuel engine (lib/fuel.ts) derives targets from it.
 */
import { create } from 'zustand';
import type { DayPlan, Meal, Profile, Race } from '@/types';
import {
  sampleMeals,
  sampleProfile,
  sampleRace,
  sampleTodayIndex,
  sampleWeek,
} from '@/data/sample';
import { nowTime } from '@/lib/format';

export type SuggestionState = 'open' | 'applied' | 'dismissed';

type State = {
  onboarded: boolean;
  /** false → the home screen shows weekly stats and a nudge to add a race. */
  hasRace: boolean;
  race: Race;
  profile: Profile;

  week: DayPlan[];
  todayIndex: number;
  /** Today's run marked complete from the home screen. */
  todayDone: boolean;

  meals: Meal[];
  /** Run-fuel chip counts keyed by label (Gel → 2). */
  runFuel: Record<string, number>;
  /** Supplements taken today keyed by name. */
  supplements: Record<string, boolean>;
  /** Litres. */
  water: number;

  /** Plan-tab adaptive suggestion. */
  suggestion: SuggestionState;
  /** Coach thread: has "Update my plan" been tapped. */
  coachApplied: boolean;
};

type Actions = {
  completeOnboarding: () => void;
  setHasRace: (v: boolean) => void;
  setRace: (patch: Partial<Race>) => void;
  setProfile: (patch: Partial<Profile>) => void;

  markTodayDone: (done: boolean) => void;

  addMeal: (meal: Omit<Meal, 'id' | 'time'> & { time?: string }) => void;
  removeMeal: (id: string) => void;
  addRunFuel: (label: string) => void;
  toggleSupplement: (name: string) => void;
  addWater: (litres: number) => void;

  setSuggestion: (s: SuggestionState) => void;
  setCoachApplied: (v: boolean) => void;
  reset: () => void;
};

const initial: State = {
  onboarded: false,
  hasRace: true,
  race: sampleRace,
  profile: sampleProfile,
  week: sampleWeek,
  todayIndex: sampleTodayIndex,
  todayDone: false,
  meals: sampleMeals,
  runFuel: {},
  supplements: { Creatine: true, Electrolytes: true },
  water: 1.75,
  suggestion: 'open',
  coachApplied: false,
};

let mealSeq = 100;

export const useAppStore = create<State & Actions>((set) => ({
  ...initial,

  completeOnboarding: () => set({ onboarded: true }),
  setHasRace: (hasRace) => set({ hasRace }),
  setRace: (patch) => set((s) => ({ race: { ...s.race, ...patch } })),
  setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

  markTodayDone: (todayDone) => set({ todayDone }),

  addMeal: (meal) =>
    set((s) => ({ meals: [...s.meals, { id: `m${mealSeq++}`, time: meal.time ?? nowTime(), ...meal }] })),
  removeMeal: (id) => set((s) => ({ meals: s.meals.filter((m) => m.id !== id) })),
  addRunFuel: (label) => set((s) => ({ runFuel: { ...s.runFuel, [label]: (s.runFuel[label] ?? 0) + 1 } })),
  toggleSupplement: (name) => set((s) => ({ supplements: { ...s.supplements, [name]: !s.supplements[name] } })),
  addWater: (l) => set((s) => ({ water: Math.min(4, Math.max(0, +(s.water + l).toFixed(2))) })),

  setSuggestion: (suggestion) => set({ suggestion }),
  setCoachApplied: (coachApplied) => set({ coachApplied }),
  reset: () => set(initial),
}));

/** Selectors */
export const selectToday = (s: State) => s.week[s.todayIndex];
export const selectTomorrow = (s: State) => s.week[(s.todayIndex + 1) % s.week.length];
