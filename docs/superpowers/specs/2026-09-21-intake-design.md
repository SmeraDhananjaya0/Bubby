# Intake v1 — goal-oriented onboarding and the coach brief

*Approved in chat 2026-09-21. Reference for implementation; the outcome is what matters.*

## Baseline (after `571e730`, 2026-09-20)

Already in `main` from Smera's session: plan builder v1 seeded from Strava history (start volume, first long run,
easy pace, `PlanSeed` + `seedSummary`), onboarding validation (`lib/validate.ts`, race name field), the whole block in
the store (`plan`, `rebuildPlan`, `syncToday`), the Plan-tab calendar, fuel v0.1 in both engines, a CDP smoke test.
This spec now covers only what is still missing: vitals (max / resting HR, level, notes), goal mode, a reference-race
fitness model driving paces and HR ranges, level-aware ramp caps, the coach brief + intro, HR-based deviation in the
sync, and Vitest.

## Why

Plan builder v0 knows only race + goal time + run days, and the coach knows only age/sex/height/weight.
Onboarding must capture **current fitness, vitals, goal mode, level and constraints**, Strava-first, so the
plan is personal and the coach opens with that context already loaded.

## Data (migration `0007_intake.sql`, then regenerate `src/lib/database.types.ts`)

`profiles` adds
- `max_hr integer` (100–230, nullable) · `resting_hr integer` (30–120, nullable)
- `level text` in `('new','intermediate','advanced')`, nullable (null = not asked yet)
- `recent_race jsonb` — `{ distance_mi, seconds, date?, source: 'manual' | 'strava' }`
- `notes text` (≤ 500 chars; injuries, schedule, constraints)

`goals` adds `mode text not null default 'time'` in `('time','finish')`.

`planned_sessions.payload` gains `hrRange?: string` (no schema change).

App types: `Profile` += `maxHr?`, `restingHr?`, `level`, `recentRace?`, `notes`; `Race` += `mode`.
`rowToProfile` / `saveProfile` / `loadRace` / `saveRace` map the new columns.

## Fitness model — `src/lib/fitness.ts` (pure, unit-tested)

- `projectTime(distMi, seconds, targetMi)` — Riegel, exponent 1.06.
- `referenceRace(profile, history)` → `{ distanceMi, seconds, source }` or null: the manual recent race if set;
  else from Strava history the fastest run ≥ 3 mi in the last 8 weeks (its avg pace × distance);
  else null.
- `trainingPaces(ref)` — from the reference projected to 10K pace `p`: recovery `p+120`, easy `p+90` (±15),
  long `p+75`, tempo `p+15`, intervals `p−15`; marathon / half goal-equivalent = Riegel projection.
- `hrZones(maxHr, restingHr?)` — Karvonen when resting HR is known, else % of max:
  Z1 < 65 · Z2 65–75 · Z3 75–82 · Z4 82–90 · Z5 90+. Returns bpm ranges per zone label used by the plan.

## Plan builder v1 — `src/lib/plan.ts`

Inputs add `profile.level`, `profile.maxHr / restingHr`, `profile.recentRace`, `race.mode`, `history`.
- **Paces:** from `trainingPaces` when a reference race exists. Mode `time`: quality paces move toward the goal
  but never more than 8 % faster than the projection (preview flags "ambitious goal"). Mode `finish`: long-run
  and race pace = projection + 30 s, quality capped at tempo. No reference race → v0 goal-derived paces
  (`finish` without data → conservative 11:00 easy).
- **Ramp by level:** weekly increase cap new 8 % · intermediate 10 % · advanced 12 %; peak caps (M / H / short)
  new 40/28/22 · intermediate 50/35/26 · advanced 60/42/30; marathon long-run cap 18 / 20 / 22 mi.
- Each session payload carries `hrRange` when max HR is known.
- `explainPlan(plan, inputs)` → two or three short lines: where the start volume came from, the peak, and why
  the paces (which reference race).

## Screens (same four steps)

- **About you** + Max HR (default from Strava max seen, else 220 − age; caption says which), Resting HR
  (optional), Level (SegmentedControl New / Intermediate / Advanced), Notes (multiline).
- **Your goal** + mode switch *A time / Just finish* (goal-time row only for *A time*); a **Current fitness**
  card: with Strava — "From Strava: 42 mi/wk · avg 9:45 /mi · fastest 5.0 mi at 8:20" and *Use a race instead*;
  manual — distance picker (1 mi / 5K / 10K / Half / Marathon) + time. The note line shows the projected
  finish for the chosen race.
- **Your plan** + a Paces card (easy / long / tempo / intervals with HR ranges) and *Why this plan* lines.
- Settings rows already open About you / Your goal, so everything stays editable.

## Coach

- `coach` function builds a **runner brief** system block (cache_control ephemeral): profile incl. new
  fields and notes, goal + mode, block (phase / week / periodization), training paces, last four weeks from
  `activities` (runs, miles, avg pace, avg HR, longest), open proposals. Volatile context (today, nutrition,
  next 14 days) stays in its own block.
- `POST { intro: true }` → no user message; the model writes the opening message (the plan and why, ≤ 120
  words), persisted as the first coach chat message. The app calls it once from `completeOnboarding` (cloud)
  and it replaces the seed greeting; local mode keeps the current greeting.
- `strava-sync` judges "too hard" by heart rate when max HR is known (easy/recovery run with avg HR at or
  above zone 3), else by pace as today.

## Tests

Vitest on `lib/fitness.ts` and `lib/plan.ts`: Riegel projection, pace table for a known 10K, level caps,
finish-mode paces, HR zones. `npm test` runs them. Manual: onboard Smera's account fresh; Max edits via
Settings; the intro message appears; rows land in `profiles` / `goals`.

## Out of scope

Chat-style intake · surfacing `strava-sync` fuel proposals in the app (next up) · Apple Health.
