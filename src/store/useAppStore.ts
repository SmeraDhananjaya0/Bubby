/**
 * App state — one zustand store, persisted per account, with cloud write-through.
 *
 * Screens read the flat top-level fields (week, profile, meals, …). Under the hood:
 *  - the store is wrapped in `persist` and keeps a per-user snapshot of everything a person
 *    owns; `hydrateForUser(uid)` swaps accounts in and out so several people can use one device;
 *  - when the account is backed by Supabase (`userId` set — see `src/lib/useAuth.ts`), every
 *    mutating action also writes through to the database via `src/data/repo.ts`, and
 *    `hydrateFromCloud()` replaces the local snapshot with the user's own data;
 *  - the coach is the `coach` edge function (Claude) when signed in, and the local rule-based
 *    `lib/coach.ts` otherwise. Both return the same `CoachProposal` contract; the plan only
 *    changes when the user approves.
 *
 * Screens never talk to Supabase directly.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';
import type { ChatMessage, CoachProposal, DayPlan, FoodOption, Meal, Profile, Race } from '@/types';
import { sampleMeals, sampleProfile, sampleRace, sampleTodayIndex, sampleWeek } from '@/data/sample';
import { nowTime } from '@/lib/format';
import { coachReply } from '@/lib/coach';
import { isCloudConfigured } from '@/lib/supabase';
import * as repo from '@/data/repo';

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

  /** Supabase auth user id when the active account is cloud-backed; null for guest / local accounts. */
  userId: string | null;
  /** True once `hydrateFromCloud()` has replaced the local snapshot with cloud data. */
  cloudReady: boolean;
  coachBusy: boolean;
};

type Actions = {
  completeOnboarding: () => void;
  setHasRace: (v: boolean) => void;
  setRace: (patch: Partial<Race>) => void;
  setProfile: (patch: Partial<Profile>) => void;

  markTodayDone: (done: boolean) => void;

  addMeal: (meal: Omit<Meal, 'id' | 'time'> & { time?: string }) => void;
  removeMeal: (id: string) => void;
  addRunFuel: (label: string, macros?: { kcal: number; carbs: number }) => void;
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
  /** Cloud session changed: `null` on sign-out. Triggers `hydrateFromCloud()` when set. */
  setCloudUser: (userId: string | null) => void;
  hydrateFromCloud: () => Promise<void>;
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
  userId: null,
  cloudReady: false,
  coachBusy: false,
};

let mealSeq = 100;
let msgSeq = 0;
const mid = () => `c${Date.now()}_${msgSeq++}`;

/** True when this account's data lives in Supabase. */
const cloud = (s: State) => isCloudConfigured && !!s.userId;
const swallow = (p: PromiseLike<unknown>) => Promise.resolve(p).catch((e) => console.warn('[bubbie] cloud write failed', e));

const dowLabel = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? iso : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
};

/** Turn a coach-function reply into the same `CoachProposal` shape the local coach uses. */
function cloudProposal(r: repo.CoachReply): CoachProposal | undefined {
  if (!r.proposals?.length) return undefined;
  return {
    id: `cloud-${Date.now()}`,
    title: r.summary ?? 'Plan change',
    changes: r.proposals.map((p) => ({ day: dowLabel(p.day), from: p.from, to: p.to })),
    apply: [],
    cloudIds: r.proposals.map((p) => p.id),
  };
}

const localReply = (clean: string): ChatMessage => {
  const st = useAppStore.getState();
  const reply = coachReply(clean, { week: st.week, todayIndex: st.todayIndex, profile: st.profile, race: st.race, hasRace: st.hasRace });
  return { id: mid(), role: 'coach', text: reply.text, at: Date.now(), proposal: reply.proposal };
};

export const useAppStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initial,

      completeOnboarding: () => {
        set({ onboarded: true });
        const s = get();
        if (!cloud(s)) return;
        const uid = s.userId!;
        swallow(
          (async () => {
            await repo.saveProfile(uid, s.profile, { onboarded: true });
            if (s.hasRace) {
              await repo.saveRace(uid, s.race);
              await repo.savePlan(uid, s.race, s.profile);
              const [wk, race] = await Promise.all([repo.loadWeek(uid), repo.loadRace(uid)]);
              set({ week: wk.week, todayIndex: wk.todayIndex, ...(race ? { race } : {}) });
            }
          })(),
        );
      },
      setHasRace: (hasRace) => set({ hasRace }),
      setRace: (patch) => {
        set((s) => ({ race: { ...s.race, ...patch } }));
        const s = get();
        if (cloud(s) && s.onboarded) {
          swallow(
            (async () => {
              await repo.saveRace(s.userId!, s.race);
              await repo.savePlan(s.userId!, s.race, s.profile);
              const wk = await repo.loadWeek(s.userId!);
              set({ week: wk.week, todayIndex: wk.todayIndex });
            })(),
          );
        }
      },
      setProfile: (patch) => {
        set((s) => ({ profile: { ...s.profile, ...patch } }));
        const s = get();
        if (cloud(s)) swallow(repo.saveProfile(s.userId!, patch));
      },

      markTodayDone: (todayDone) => set({ todayDone }),

      addMeal: (meal) => {
        const s = get();
        if (cloud(s)) {
          const tempId = `tmp-${Date.now()}`;
          set((st) => ({ meals: [...st.meals, { id: tempId, time: nowTime(), ...meal }] }));
          swallow(
            repo.insertMeal(s.userId!, meal).then((saved) => {
              if (saved) set((st) => ({ meals: st.meals.map((m) => (m.id === tempId ? saved : m)) }));
            }),
          );
          return;
        }
        set((st) => ({ meals: [...st.meals, { id: `m${mealSeq++}`, time: meal.time ?? nowTime(), ...meal }] }));
      },
      removeMeal: (id) => {
        set((st) => ({ meals: st.meals.filter((m) => m.id !== id) }));
        const s = get();
        // Only real rows (uuids) exist in the cloud; sample ("m1") and optimistic ("tmp-") ids don't.
        if (cloud(s) && id.includes('-') && !id.startsWith('tmp-')) swallow(repo.deleteMeal(s.userId!, id));
      },
      addRunFuel: (label, macros) => {
        set((st) => ({ runFuel: { ...st.runFuel, [label]: (st.runFuel[label] ?? 0) + 1 } }));
        const s = get();
        if (cloud(s) && macros) swallow(repo.insertMeal(s.userId!, { name: 'Run fuel', desc: label, kcal: macros.kcal, carbs: macros.carbs, protein: 0, fat: 0 }, 'run_fuel'));
      },
      toggleSupplement: (name) => {
        const on = !get().supplements[name];
        set((st) => ({ supplements: { ...st.supplements, [name]: on } }));
        const s = get();
        if (cloud(s)) swallow(repo.setSupplement(s.userId!, name, on));
      },
      addWater: (l) => {
        set((st) => ({ water: Math.min(4, Math.max(0, +(st.water + l).toFixed(2))) }));
        const s = get();
        if (cloud(s)) swallow(repo.logWater(s.userId!, l));
      },
      addCustomFood: (food) =>
        set((s) => (s.customFoods.some((f) => f.name.toLowerCase() === food.name.toLowerCase()) ? s : { customFoods: [food, ...s.customFoods] })),

      setSuggestion: (suggestion) => set({ suggestion }),
      setCoachApplied: (coachApplied) => set({ coachApplied }),

      sendCoachMessage: (text) => {
        const clean = text.trim();
        if (!clean) return;
        const userMsg: ChatMessage = { id: mid(), role: 'you', text: clean, at: Date.now() };
        set((s) => ({ chat: [...s.chat, userMsg], coachBusy: true }));

        if (cloud(get())) {
          repo
            .askCoach(clean)
            .then((r) => {
              const coachMsg: ChatMessage = { id: mid(), role: 'coach', text: r.reply, at: Date.now(), proposal: cloudProposal(r) };
              set((st) => ({ chat: [...st.chat, coachMsg], coachBusy: false }));
            })
            .catch((e) => {
              // Function not deployed / no ANTHROPIC_API_KEY yet → the local coach still answers.
              console.warn('[bubbie] coach function failed, using local coach', e);
              set((st) => ({ chat: [...st.chat, localReply(clean)], coachBusy: false }));
            });
          return;
        }

        // Local coach: reply after a beat so the exchange feels like a conversation.
        setTimeout(() => set((st) => ({ chat: [...st.chat, localReply(clean)], coachBusy: false })), 450);
      },

      applyProposal: (messageId, proposal) => {
        const confirm = (): ChatMessage => ({
          id: mid(),
          role: 'coach',
          at: Date.now(),
          text: `Done — plan updated. ${proposal.changes.length} ${proposal.changes.length === 1 ? 'day' : 'days'} changed. I'll check in to see how you're feeling before we ramp back up.`,
        });
        const markApplied = (chat: ChatMessage[]) => [...chat.map((m) => (m.id === messageId ? { ...m, proposalStatus: 'applied' as const } : m)), confirm()];

        const s = get();
        if (cloud(s) && proposal.cloudIds?.length) {
          // Server-side: decide_proposal() rewrites the sessions atomically, then we reload the week.
          swallow(
            (async () => {
              for (const id of proposal.cloudIds!) await repo.decideProposal(id, 'accepted').catch((e) => console.warn(e));
              const wk = await repo.loadWeek(s.userId!);
              set((st) => ({ week: wk.week, todayIndex: wk.todayIndex, coachApplied: true, chat: markApplied(st.chat) }));
            })(),
          );
          return;
        }
        set((st) => ({
          week: st.week.map((d) => {
            const change = proposal.apply.find((a) => a.dow === d.dow);
            return change ? { ...d, ...change.patch } : d;
          }),
          coachApplied: true,
          chat: markApplied(st.chat),
        }));
      },

      dismissProposal: (messageId) => {
        const s = get();
        const msg = s.chat.find((m) => m.id === messageId);
        if (cloud(s) && msg?.proposal?.cloudIds?.length) {
          for (const id of msg.proposal.cloudIds) swallow(repo.decideProposal(id, 'dismissed'));
        }
        set((st) => ({ chat: st.chat.map((m) => (m.id === messageId ? { ...m, proposalStatus: 'dismissed' as const } : m)) }));
      },

      hydrateForUser: (uid) =>
        set((s) => {
          if (uid === s.activeUid) return s;
          const snapshots = { ...s.snapshots };
          if (s.activeUid) snapshots[s.activeUid] = snapshotOf(s);
          const next = snapshots[uid] ?? freshUserData();
          if (snapshots[uid]) delete snapshots[uid];
          return { ...next, activeUid: uid, snapshots, cloudReady: false };
        }),

      setHydrated: () => set({ hydrated: true }),

      setCloudUser: (userId) => {
        set({ userId, cloudReady: false });
        if (userId) void get().hydrateFromCloud();
      },

      hydrateFromCloud: async () => {
        const s = get();
        if (!cloud(s)) return;
        const uid = s.userId!;
        try {
          const [prof, race, wk, nut] = await Promise.all([repo.loadProfile(uid), repo.loadRace(uid), repo.loadWeek(uid), repo.loadNutrition(uid)]);
          const onboarded = !!prof?.onboarded;
          const hasPlan = wk.week.some((d) => d.type !== 'rest');
          set({
            cloudReady: true,
            ...(prof ? { profile: prof.profile, onboarded: onboarded || s.onboarded } : {}),
            ...(race ? { race, hasRace: true } : onboarded ? { hasRace: false } : {}),
            // A brand-new cloud account keeps the sample week until onboarding builds a real plan.
            ...(hasPlan || onboarded ? { week: wk.week, todayIndex: wk.todayIndex } : {}),
            ...(onboarded ? { meals: nut.meals, supplements: nut.supplements, water: nut.water, runFuel: {} } : {}),
          });
        } catch (e) {
          console.warn('[bubbie] hydrate failed', e);
        }
      },

      reset: () => {
        const s = get();
        set({ ...freshUserData(), activeUid: s.activeUid, snapshots: s.snapshots, hydrated: true, userId: s.userId, cloudReady: false });
      },
    }),
    {
      name: 'bubbie:app',
      storage: zustandStorage,
      partialize: (s) => {
        // Transient: hydration flag, cloud session, coach busy state.
        const { hydrated, userId, cloudReady, coachBusy, ...rest } = s;
        return rest;
      },
      onRehydrateStorage: () => () => useAppStore.getState().setHydrated(),
    },
  ),
);

/** Selectors */
export const selectToday = (s: State) => s.week[s.todayIndex];
export const selectTomorrow = (s: State) => s.week[(s.todayIndex + 1) % s.week.length];
