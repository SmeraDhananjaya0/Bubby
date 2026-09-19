/**
 * The coach engine, v0 — a local, rule-based stand-in for the LLM backend
 * (CLAUDE.md → Roadmap #5). It reads the user's message plus the current plan
 * and returns a reply, optionally with a structured `CoachProposal`.
 *
 * Proposals are never auto-applied: the UI renders the strike-through list and
 * the store only mutates when the user taps "Update my plan". Swapping this
 * function for a real model later keeps that same contract.
 */
import type { CoachProposal, DayPlan, PlanChange, Profile, Race } from '@/types';
import { targetsFor } from '@/lib/fuel';
import { n } from '@/lib/format';

export type CoachContext = {
  week: DayPlan[];
  todayIndex: number;
  profile: Profile;
  race: Race;
  hasRace: boolean;
};

export type CoachReply = { text: string; proposal?: CoachProposal };

let seq = 0;
const pid = () => `p${Date.now()}_${seq++}`;

const has = (s: string, words: string[]) => words.some((w) => s.includes(w));

/** Human label for a day, e.g. "Long run · 16 mi" or "Rest". */
function label(d: DayPlan) {
  return d.miles ? `${d.title}${d.miles ? ` ${d.miles} mi` : ''}` : d.title;
}

/** Indices of the next `count` training (non-rest) days starting at today. */
function nextTrainingDays(week: DayPlan[], todayIndex: number, count: number) {
  const out: number[] = [];
  for (let step = 0; step < week.length && out.length < count; step++) {
    const i = (todayIndex + step) % week.length;
    if (week[i].type !== 'rest') out.push(i);
  }
  return out;
}

const restPatch: Partial<DayPlan> = {
  type: 'rest',
  title: 'Rest',
  miles: 0,
  pace: undefined,
  effort: undefined,
  fuel: undefined,
  done: undefined,
  note: 'Rest day — adjusted by your coach.',
};

function restProposal(ctx: CoachContext, count: number, title: string, caution?: string): CoachProposal {
  const idxs = nextTrainingDays(ctx.week, ctx.todayIndex, count);
  const changes: PlanChange[] = idxs.map((i) => ({ day: ctx.week[i].dow, from: label(ctx.week[i]), to: 'Rest' }));
  return {
    id: pid(),
    title,
    changes,
    apply: idxs.map((i) => ({ dow: ctx.week[i].dow, patch: restPatch })),
    caution,
  };
}

/** Turn the next hard day (tempo/intervals) into an easy run of the same length. */
function easeProposal(ctx: CoachContext, title: string): CoachProposal | undefined {
  const idxs = nextTrainingDays(ctx.week, ctx.todayIndex, ctx.week.length);
  const hard = idxs.find((i) => ctx.week[i].type === 'tempo' || ctx.week[i].type === 'intervals');
  if (hard === undefined) return undefined;
  const d = ctx.week[hard];
  const miles = Math.max(3, Math.round(d.miles * 0.7));
  return {
    id: pid(),
    title,
    changes: [{ day: d.dow, from: label(d), to: `Easy ${miles} mi` }],
    apply: [
      {
        dow: d.dow,
        patch: {
          type: 'easy',
          title: 'Easy',
          miles,
          effort: 'Zone 2',
          pace: undefined,
          fuel: 'Water',
          note: 'Eased off by your coach — keep it conversational.',
        },
      },
    ],
  };
}

export function coachReply(input: string, ctx: CoachContext): CoachReply {
  const s = input.trim().toLowerCase();
  const today = ctx.week[ctx.todayIndex];
  const t = targetsFor(today, ctx.profile);

  if (!s) return { text: "Tell me what's up and I'll adjust your plan or fueling." };

  // Injury
  if (has(s, ['hurt', 'injur', 'knee', 'pain', 'sprain', 'shin', 'ankle', 'strain', 'sore knee'])) {
    return {
      text: "Sorry about that — let's back off so it can settle. Here's what I'd change:",
      proposal: restProposal(
        ctx,
        3,
        'Rest and reassess',
        "If it's swollen, locking, or you can't put weight on it, get it checked by a doctor or physio before running again.",
      ),
    };
  }

  // Illness
  if (has(s, ['sick', 'cold', 'flu', 'ill', 'fever', 'covid', 'unwell', 'throat'])) {
    return {
      text: 'Rest up. Above the neck (light cold) you can walk or jog very easy; anything with a fever means no training. I\'ll clear the next couple of days:',
      proposal: restProposal(ctx, 2, 'Recover from illness', 'No hard efforts until you\'ve been symptom-free for 24 hours.'),
    };
  }

  // Travel
  if (has(s, ['travel', 'flight', 'flying', 'trip', 'vacation', 'holiday', 'away', 'out of town'])) {
    return {
      text: "Travel weeks are about consistency, not heroics. I'll turn the next few days to rest — do an easy shakeout when you land if you can:",
      proposal: restProposal(ctx, 2, 'Adjust for travel'),
    };
  }

  // Tired / overreached
  if (has(s, ['tired', 'exhaust', 'fatigue', 'wiped', 'drained', 'burnt', 'burned out', 'heavy legs'])) {
    const p = easeProposal(ctx, 'Ease the next hard day');
    return {
      text: p
        ? "Legs sound cooked. Let's swap the next hard session for an easy run so you actually absorb the training:"
        : "Legs sound cooked. Keep everything easy for a few days, sleep more, and eat enough carbs — your rest days already have you covered.",
      proposal: p,
    };
  }

  // Fueling / what to eat
  if (has(s, ['eat', 'food', 'fuel', 'calorie', 'carb', 'protein', 'meal', 'breakfast', 'dinner', 'lunch', 'hungry'])) {
    const kind = today.type === 'rest' ? 'a rest day' : `a ${today.type === 'long' ? 'long-run' : today.type} day`;
    return {
      text:
        `Today is ${kind}, so aim for about ${n(t.kcal)} kcal, ${t.carbs} g carbs and ${t.protein} g protein ` +
        `(fat around ${t.fat} g).` +
        (today.type === 'rest'
          ? ' Carbs come down since you\'re not running, but keep protein steady and spread it across your meals.'
          : today.type === 'long' || today.type === 'tempo' || today.type === 'intervals'
            ? ' Load carbs before and after the session, and get 25–30 g protein in within an hour of finishing.'
            : ' Normal balanced meals are plenty — no special fueling needed.'),
    };
  }

  // Pace / plan questions
  if (has(s, ['pace', 'zone', 'hr', 'heart rate', 'how fast', 'how hard'])) {
    return {
      text: today.type === 'rest'
        ? "Nothing scheduled today — it's a rest day. Tomorrow's run is where to put the effort."
        : `Today's ${today.title.toLowerCase()} is ${today.effort ?? 'an easy effort'}${today.pace ? ` at ${today.pace} /mi` : ''}. Stick to that even if you feel good — the easy days are what let the hard days count.`,
    };
  }

  // Race questions
  if (ctx.hasRace && has(s, ['race', 'goal', 'marathon', 'half', 'ready', 'taper'])) {
    return {
      text: `You're in the ${ctx.race.phase.toLowerCase()} phase, week ${ctx.race.currentWeek} of ${ctx.race.totalWeeks}, aiming for ${ctx.race.goalTime} at ${ctx.race.name}. Trust the block — the taper will have you fresh on race day.`,
    };
  }

  // Greeting
  if (has(s, ['hi', 'hey', 'hello', 'yo', 'morning', 'good morning'])) {
    return {
      text: today.type === 'rest'
        ? "Morning! Rest day today — the best thing you can do is eat well and sleep. Anything on your mind?"
        : `Morning! On the plan today: ${today.title.toLowerCase()}${today.miles ? ` · ${today.miles} mi` : ''}. How are you feeling?`,
    };
  }

  // Fallback
  return {
    text: "Got it. I can move runs around, ease off when you're beat up or injured, or tell you exactly what to eat today — just say the word (e.g. \"I tweaked my knee\" or \"what should I eat\").",
  };
}
