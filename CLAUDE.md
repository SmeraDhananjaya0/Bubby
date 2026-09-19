# Bubbie — Claude Code guide

Bubbie is a marathon / half-marathon training app where **fuel follows the workout**: calories and carbs
rise on big days and ease off on rest days, protein stays steady, and an in-app coach re-plans when a run
differs, intake is off, or you tell it something changed (injury, travel, sickness). You approve every change.

This file is the working contract for anyone (human or Claude Code) touching the repo. Read it before
writing code. `design/DESIGN.md` is the visual spec; `design/canvas/` holds the source wireframes.

## Stack

- **Expo SDK 57** · React Native 0.86 · TypeScript (strict) · `expo-router` (file routes in `app/`)
- State: **zustand** (`src/store/useAppStore.ts`) — one store, no persistence yet
- Graphics: `react-native-svg` (rings, charts, ambient glows), `lucide-react-native` icons, `expo-blur` for the tab bar
- Fonts: **Manrope** (UI + numbers) and **Instrument Serif Italic** (one editorial line per screen, max) via `@expo-google-fonts`
- Path alias: `@/*` → `src/*`

```bash
npm install
npx expo start          # then i / a / w
npm run typecheck       # tsc --noEmit — must pass before every commit
```

## Repo map

```
app/                          # routes (expo-router)
  _layout.tsx                 # fonts, splash, root Stack
  index.tsx                   # → onboarding or tabs
  (onboarding)/               # welcome → connected → about-you → goal → plan-preview
  (tabs)/                     # today · plan · log · coach  (custom FloatingTabBar)
  nutrients.tsx               # pushed from Log
  plan-updated.tsx            # modal: a run synced from Strava changed the plan
  recap.tsx                   # modal: yesterday's fueling recap
src/
  theme/tokens.ts             # colors, hues, radii, spacing, shadows, type scale, ambient presets  ← the design system
  components/                 # Screen, Header, Card, Button, Chip, Stat, Bar, Rings, WeekBars, BlockChart, TrendChart, …
  features/today/             # the cards that compose the home screen
  store/useAppStore.ts        # app state + selectors
  lib/fuel.ts                 # the fuel engine: targets, protocol, sums
  lib/format.ts               # dates, numbers, pace math
  data/sample.ts              # sample data mirroring the design canvas
  types.ts
design/
  DESIGN.md                   # visual spec + screen map
  canvas/                     # the 18 wireframe artboards (.dc.html) + canvas.json — source of truth for layout
  screens/                    # screenshots of THIS app running (web build), for visual regression by eye
  product-flow.pdf            # the product brief the fuel-first flow was designed from
```

## Design rules (non-negotiable)

1. **Tokens only.** Every color, radius, shadow and font comes from `src/theme/tokens.ts`. If you need a new
   value, add it there with a comment. Never inline a hex in a screen.
2. **One hue per meaning.** accent-blue = running/calories/race · amber = carbs/fueling/tempo · teal = trends/protein
   · violet = recovery/long runs/supplements · green = food/Log · sky = hydration/sodium/tomorrow. Macros are
   always calories-blue / carbs-amber / protein-teal / fat-violet (`macroHue`).
3. **Card grammar.** White card, 24 radius, 16/18/18 padding, `CardHeader` (hue icon + hue title, muted meta on
   the right), 14px internal gap, footers sit above a hairline. Cards never touch the screen edge (20px gutters).
4. **Ambient, not loud.** Backgrounds are the warm ground + three soft glows (`ambients` preset per section).
   No gradient washes on cards, no left-border cards, no emoji, no fake status bars.
5. **Type.** Manrope 800 for numbers and headlines (tight tracking), 700 for labels, 500/600 for body and captions.
   Instrument Serif italic is the flare — race names and one headline line, never body copy.
6. **Contrast.** `hue.text` on white ≥ 4.5:1; `hue.fill` is for rings/bars/buttons only (≥ 3:1). Primary buttons
   are ink (`#1B1A19`) with white text; the accent is never a button fill.
7. **Real controls.** `Pressable`/`TextInput` with `accessibilityRole` and labels on icon-only buttons.
   Touch targets ≥ 44px.
8. **Numbers come from the engine.** Anything shown as a *target* (kcal, carbs, protein, fat, protocol)
   must come from `lib/fuel.ts`. Sample *logged* data lives in `data/sample.ts` until real logging exists.

## State & data flow

- `useAppStore` holds: race, profile, the current week (`DayPlan[]`), today's index, meals, run-fuel counts,
  supplements taken, water, the Plan-tab suggestion state, and whether the Coach's plan change was applied.
- `targetsFor(day, profile)` → `{kcal, carbs, protein, fat}`. `protocolFor(day)` → before/during/after + carry list.
- Screens compute derived values in render (cheap) — keep it that way until there's a perf reason not to.
- No persistence yet. First real task in that area: wrap the store with `zustand/middleware` `persist` + AsyncStorage.

## Screen map (design canvas → code)

| Canvas artboard | Route / component |
|---|---|
| 1 · Welcome | `app/(onboarding)/welcome.tsx` |
| 2 · Strava connected | `app/(onboarding)/connected.tsx` |
| 3 · About you | `app/(onboarding)/about-you.tsx` |
| 4 · Your goal | `app/(onboarding)/goal.tsx` (also the "Add a race" target) |
| 5 · Your plan | `app/(onboarding)/plan-preview.tsx` |
| Today · race mode + Today · fuel view | `app/(tabs)/today.tsx` with `hasRace = true` → RaceCard, FuelTodayCard, WorkoutCard, FuelingCard, WeekAgainstPlanCard, TomorrowCard, RecoveryCard |
| Today · no race set | `app/(tabs)/today.tsx` with `hasRace = false` → ThisWeekCard, FuelTodayCard, ProgressCard, NoRaceNudge, PersonalBestsCard, RecoveryCard |
| Plan + This week | `app/(tabs)/plan.tsx` (week list, adaptive suggestion, block chart, totals) |
| Fuel + Log | `app/(tabs)/log.tsx` (search/snap, remaining, run fuel & supplements, meals + dinner sheet, hydration) |
| Nutrients | `app/nutrients.tsx` |
| Plan updated · from Strava | `app/plan-updated.tsx` (modal) |
| Recap · yesterday | `app/recap.tsx` (modal) |
| Coach · proposal / after update | `app/(tabs)/coach.tsx` (one screen, `coachApplied` toggles the second half) |
| How the plan adapts | not a screen — it's the architecture; see "Roadmap" |

## Conventions

- Components are function components, props typed inline, no default exports outside `app/`.
- Keep route files thin: layout + data wiring. Cards and widgets live in `src/features/<tab>/` or `src/components/`.
- Prefer `gap` over margins. Rows are `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'`.
- Use `boxShadow` strings from `shadows` (new architecture); don't add `elevation`/`shadow*` props.
- Sample copy is fine to edit in place; sample *numbers* should be changed in `data/sample.ts`, not in JSX.
- Commit messages: imperative, one line, e.g. `Add persist middleware to app store`.

## Roadmap (in order)

1. **Persistence** — `persist` middleware; onboarding completion, profile, race and logs survive restarts.
2. **Strava OAuth + activity sync** — `expo-auth-session`; map activities → `DayPlan.done`, trigger `plan-updated`
   when a synced run differs from the plan (HR / duration / distance thresholds live in `lib/fuel.ts`).
3. **Apple Health** — read workouts + HR (HealthKit via a config plugin), write nutrition; iOS only, gate by platform.
4. **Fuel engine v1** — replace the per-mile constants with HR-load–based fitness/fatigue (the "Training model"
   box in `design/product-flow.pdf`); keep targets explainable (the coach should be able to say *why*).
5. **Coach** — real LLM backend behind the composer. Proposals must arrive as structured `PlanChange[]` the UI
   renders in the strike-through list; the user approves; only then does the store mutate. Log every proposal +
   outcome (this becomes the eval set for grading the adaptation engine).
6. **Food search / photo logging** — the search field and camera button on Log are wired to nothing yet.
7. **Notifications** — morning recap (`recap.tsx`) and post-run `plan-updated` as pushes.

## Things to keep in mind

- The web build works (`npx expo export --platform web`) and is how `design/screens/` was captured — useful for
  fast visual checks without a simulator. Native is the target.
- SVG gradient ids are made unique with `useId()` because several screens stay mounted; keep doing that.
- The floating tab bar is a custom `tabBar` on `expo-router` Tabs; the "+" circle routes to Log with `?add=1`.
