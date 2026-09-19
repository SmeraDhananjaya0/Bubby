/**
 * App state — one zustand store, now persisted per account.
 *
 * Screens read the flat top-level fields (week, profile, meals, …) exactly as
 * before. What changed: the store is wrapped in `persist`, and it keeps a
 * per-user snapshot of everything a person owns. `hydrateForUser(uid)` swaps the
 * active account in and out, so several people can sign in on one device and
 * each keeps their own plan, logs and coach thread.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';
import type { ChatMessage, CoachProposal, DayPlan, FoodOption, Meal, Profile, Race } from '@/types';
import {
  sampleMeals,
  sampleProfile,
  sampleRace,
  sampleTodayIndex,
  sampleWeek,
} from '@/data/sample';
import { nowTime } from '@/lib/format';
import { coachReply } from '@/lib/coach';

export type SuggestionState = 'open' | 'applied' | 'dismissed';

/** Everything one account owns. Archived per user id in `snapshots`. */
type UserData = {
  onboarded: boolean;
  hasRace: boolean;
  race: Race;
  profile: Profile;
  week: DayPlan[];
  todayIndex: number;
  todayDone: boolean;
  meals: Meal[];
  runFuel: Record<string, number>;
  supplements: Record<string, boolean>;
  water: number;
  suggestion: SuggestionState;
  coachApplied: boolean;
  chat: ChatMessage[];
  /** Foods the user has typed in manually on the Log tab. */
  customFoods: FoodOption[];
};

type State = UserData & {
  /** Which account's data is currently loaded into the flat fields above. */
  activeUid: string | null;
  /** Archived data for every other account seen on this device. */
  snapshots: Record<string, UserData>;
  /** True once persisted state has loaded. */
  hydrated: boolean;
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
  addCustomFood: (food: FoodOption) => void;

  setSuggestion: (s: SuggestionState) => void;
  setCoachApplied: (v: boolean) => void;

  sendCoachMessage: (text: string) => void;
  applyProposal: (messageId: string, proposal: CoachProposal) => void;
  dismissProposal: (messageId: string) => void;

  hydrateForUser: (uid: string) => void;
  setHydrated: () => void;
  reset: () => void;
};

const greeting = (): ChatMessage => ({
  id: 'seed-greeting',
  role: 'coach',
  at: Date.now(),
  text: "Hey — I'm your coach. Tell me how a run felt, if something's changed (injury, travel, sickness), or ask what to eat today, and I'll adjust your plan.",
});

/** A fresh account: the demo plan, but not yet onboarded. */
function freshUserData(): UserData {
  return {
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
    chat: [greeting()],
    customFoods: [],
  };
}

function snapshotOf(s: State): UserData {
  return {
    onboarded: s.onboarded,
    hasRace: s.hasRace,
    race: s.race,
    profile: s.profile,
    week: s.week,
    todayIndex: s.todayIndex,
    todayDone: s.todayDone,
    meals: s.meals,
    runFuel: s.runFuel,
    supplements: s.supplements,
    water: s.water,
    suggestion: s.suggestion,
    coachApplied: s.coachApplied,
    chat: s.chat,
    customFoods: s.customFoods,
  };
}

const initial: State = {
  ...freshUserData(),
  activeUid: null,
  snapshots: {},
  hydrated: false,
};

let mealSeq = 100;
let msgSeq = 0;
const mid = () => `c${Date.now()}_${msgSeq++}`;

export const useAppStore = create<State & Actions>()(
  persist(
    (set, get) => ({
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
      addCustomFood: (food) =>
        set((s) => (s.customFoods.some((f) => f.name.toLowerCase() === food.name.toLowerCase()) ? s : { customFoods: [food, ...s.customFoods] })),

      setSuggestion: (suggestion) => set({ suggestion }),
      setCoachApplied: (coachApplied) => set({ coachApplied }),

      sendCoachMessage: (text) => {
        const clean = text.trim();
        if (!clean) return;
        const userMsg: ChatMessage = { id: mid(), role: 'you', text: clean, at: Date.now() };
        set((s) => ({ chat: [...s.chat, userMsg] }));
        // Reply after a beat so the exchange feels like a conversation.
        setTimeout(() => {
          const s = get();
          const reply = coachReply(clean, { week: s.week, todayIndex: s.todayIndex, profile: s.profile, race: s.race, hasRace: s.hasRace });
          const coachMsg: ChatMessage = { id: mid(), role: 'coach', text: reply.text, at: Date.now(), proposal: reply.proposal };
          set((st) => ({ chat: [...st.chat, coachMsg] }));
        }, 450);
      },

      applyProposal: (messageId, proposal) =>
        set((s) => {
          const week = s.week.map((d) => {
            const change = proposal.apply.find((a) => a.dow === d.dow);
            return change ? { ...d, ...change.patch } : d;
          });
          const confirm: ChatMessage = {
            id: mid(),
            role: 'coach',
            at: Date.now(),
            text: `Done — plan updated. ${proposal.changes.length} ${proposal.changes.length === 1 ? 'day' : 'days'} changed. I'll check in to see how you're feeling before we ramp back up.`,
          };
          return {
            week,
            coachApplied: true,
            chat: [...s.chat.map((m) => (m.id === messageId ? { ...m, proposalStatus: 'applied' as const } : m)), confirm],
          };
        }),

      dismissProposal: (messageId) =>
        set((s) => ({ chat: s.chat.map((m) => (m.id === messageId ? { ...m, proposalStatus: 'dismissed' as const } : m)) })),

      hydrateForUser: (uid) =>
        set((s) => {
          if (uid === s.activeUid) return s;
          const snapshots = { ...s.snapshots };
          if (s.activeUid) snapshots[s.activeUid] = snapshotOf(s);
          const next = snapshots[uid] ?? freshUserData();
          if (snapshots[uid]) delete snapshots[uid];
          return { ...next, activeUid: uid, snapshots };
        }),

      setHydrated: () => set({ hydrated: true }),

      reset: () =>
        set((s) => ({ ...freshUserData(), activeUid: s.activeUid, snapshots: s.snapshots, hydrated: true })),
    }),
    {
      name: 'bubbie:app',
      storage: zustandStorage,
      partialize: (s) => {
        const { hydrated, ...rest } = s;
        return rest;
      },
      onRehydrateStorage: () => () => useAppStore.getState().setHydrated(),
    },
  ),
);

/** Selectors */
export const selectToday = (s: State) => s.week[s.todayIndex];
export const selectTomorrow = (s: State) => s.week[(s.todayIndex + 1) % s.week.length];
