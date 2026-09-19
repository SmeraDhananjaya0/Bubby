export type WorkoutType = 'easy' | 'recovery' | 'intervals' | 'tempo' | 'long' | 'rest';

export type DayPlan = {
  /** Mon … Sun */
  dow: string;
  /** Day of month, for the week strip. */
  date: number;
  type: WorkoutType;
  title: string;
  /** Planned miles; 0 for rest. */
  miles: number;
  /** Pace range as shown, e.g. "9:15–9:45". */
  pace?: string;
  effort?: string;
  /** Short coaching note shown when the day is expanded. */
  note: string;
  /** Fueling hint for the run itself. */
  fuel?: string;
  /** Set when the run has been logged: "5.1 mi · 47:05 · 9:14 /mi". */
  done?: string;
  /** Scheduled start, e.g. "7:00 AM". */
  time?: string;
};

export type Macros = { kcal: number; carbs: number; protein: number; fat: number };

export type Meal = {
  id: string;
  /** Slot name: Breakfast, Lunch, Run fuel, Dinner … */
  name: string;
  /** What it was. */
  desc: string;
  time?: string;
} & Macros;

export type FoodOption = { name: string } & Macros;

export type RunFuel = { label: string; sub: string; kcal: number; carbs: number };

export type Supplement = { name: string; dose: string; why: string };

export type Race = {
  name: string;
  distance: '5K' | '10K' | 'Half' | 'Marathon';
  miles: number;
  /** ISO date, local. */
  date: string;
  /** "3:45:00" */
  goalTime: string;
  totalWeeks: number;
  currentWeek: number;
  phase: string;
};

export type Profile = {
  age: number;
  sex: 'Female' | 'Male' | 'Other' | '';
  heightIn: number;
  weightLb: number;
  diet: string;
  runDaysPerWeek: number;
};

export type ChatRole = 'coach' | 'you';

/** A single proposed edit shown in the coach's strike-through list. */
export type PlanChange = { day: string; from: string; to: string };

/**
 * A structured proposal the coach attaches to a message. The UI renders the
 * `changes` list; only when the user approves do we mutate the plan via `apply`.
 * This mirrors the eventual LLM contract (see CLAUDE.md → Roadmap #5).
 */
export type CoachProposal = {
  id: string;
  title: string;
  changes: PlanChange[];
  /** Which workout days to overwrite, and how. Applied on approval. */
  apply: { dow: string; patch: Partial<DayPlan> }[];
  /** Optional caution shown under the proposal. */
  caution?: string;
  /** Set when the proposal lives in the database (signed-in mode): applied via `decide_proposal`. */
  cloudIds?: string[];
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  /** ms epoch. */
  at: number;
  proposal?: CoachProposal;
  /** Set once the user acts on an attached proposal. */
  proposalStatus?: 'applied' | 'dismissed';
};

/** A signed-in person. `provider` records how they authenticated. */
export type User = {
  id: string;
  name: string;
  email: string;
  photo?: string;
  provider: 'google' | 'email' | 'guest';
  /** Supabase auth user id when this account is backed by the cloud; absent for local/guest accounts. */
  cloudId?: string;
};
