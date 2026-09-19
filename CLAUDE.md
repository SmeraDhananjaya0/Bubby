# Bubbie — Claude Code guide

Bubbie is a marathon / half-marathon training app where **fuel follows the workout**: calories and carbs
rise on big days and ease off on rest days, protein stays steady, and an in-app coach re-plans when a run
differs, intake is off, or you tell it something changed (injury, travel, sickness). You approve every change.

This file is the working contract for anyone (human or Claude Code) touching the repo. Read it before
writing code. `design/DESIGN.md` is the visual spec; `design/canvas/` holds the source wireframes.

## Stack

- **Expo SDK 57** · React Native 0.86 · TypeScript (strict) · `expo-router` (file routes in `app/`)
- State: **zustand** (`src/store/useAppStore.ts`) — one store, persisted with AsyncStorage, write-through to Supabase
- Backend: **Supabase** — Postgres + RLS, email-OTP auth, edge functions `strava-auth` / `strava-sync` / `coach` (Deno).
  All client access goes through `src/data/repo.ts`; screens never import supabase-js.
- Targets: iOS via **EAS Build** (`eas.json`), web as a static SPA on **Vercel** (`vercel.json`, `public/`), Android via EAS
- Graphics: `react-native-svg` (rings, charts, ambient glows), `lucide-react-native` icons, `expo-blur` for the tab bar
- Fonts: **Manrope** (UI + numbers) and **Instrument Serif Italic** (one editorial line per screen, max) via `@expo-google-fonts`
- Path alias: `@/*` → `src/*`

```bash
npm install
npx expo start          # then i / a / w   (no .env → local mode with sample data)
npm run typecheck       # tsc --noEmit — must pass before every commit
npm run build:web       # static export to dist/ (what Vercel runs)
npm run build:ios:sim   # EAS dev-client build for the simulator
```

Two runtime modes, decided by `isCloudConfigured` (`src/lib/supabase.ts`) and `userId` in the app store:
**local** (no env, or a guest / device-only account: sample data, on-device persistence per account, the
rule-based coach in `lib/coach.ts`) and **cloud** (a Supabase-backed account: `hydrateFromCloud()` replaces the
sample data, onboarding builds a real plan with `lib/plan.ts` → `repo.savePlan()`, the coach is the `coach` edge
function, and every mutating action also writes to Supabase via `swallow(repo.…)` so a failed write never breaks
the UI). `useAuthStore` is the identity (`User`); `useAuth()` maps a Supabase session onto it. Keep both modes working.

## Repo map

```
app/                          # routes (expo-router)
  _layout.tsx                 # fonts, splash, useAuth(), root Stack
  index.tsx                   # → sign-in (cloud, signed out) / onboarding / tabs
  (auth)/sign-in.tsx          # cloud: pick a runner + personal code (features/auth/CodeSignIn) · local: Google / email / guest
  (onboarding)/               # welcome → connected → about-you → goal → plan-preview
  settings.tsx                # account, profile/race shortcuts, reset, sign out
  (tabs)/                     # today · plan · log · coach  (custom FloatingTabBar)
  nutrients.tsx               # pushed from Log
  plan-updated.tsx            # modal: a run synced from Strava changed the plan
  recap.tsx                   # modal: yesterday's fueling recap
  strava.tsx                  # web OAuth landing: Strava redirects here with ?code, we exchange it and continue
src/
  theme/tokens.ts             # colors, hues, radii, spacing, shadows, type scale, ambient presets  ← the design system
  components/                 # Screen, Header, Card, Button, Chip, Stat, Bar, Rings, WeekBars, BlockChart, TrendChart, …
  features/today/             # the cards that compose the home screen
  store/useAppStore.ts        # app state + selectors (persist, per-account snapshots, cloud write-through)
  store/useAuthStore.ts       # who is signed in (User); cloud accounts carry `cloudId`
  data/repo.ts                # the ONLY Supabase access layer: DB rows ↔ app types, rpc, edge-function calls, savePlan()
  data/sample.ts              # sample data mirroring the design canvas (local mode)
  data/members.ts             # who can sign in to the live app; their code is their Supabase password
  lib/supabase.ts             # client + isCloudConfigured + callFunction()
  lib/useAuth.ts              # Supabase session ↔ useAuthStore/useAppStore; sendCode / verifyCode / signInWithGoogle
  lib/google.ts               # expo-auth-session Google (local mode only; cloud uses Supabase OAuth)
  lib/coach.ts                # local rule-based coach — the fallback when the coach function isn't reachable
  lib/plan.ts                 # plan builder v0: goal + profile → periodized block of daily sessions (pure)
  lib/strava.ts               # Strava OAuth: auth-session on native, full-page redirect → app/strava.tsx on web
  lib/storage.ts              # AsyncStorage adapter for zustand persist
  lib/health.ts               # Apple Health adapter (iOS; native module loaded lazily)
  lib/database.types.ts       # Database type (hand-condensed; regenerate with supabase gen types)
  lib/fuel.ts                 # the fuel engine: targets, protocol, sums
  lib/format.ts               # dates, numbers, pace math
  types.ts
supabase/
  schema.sql                  # full schema of the live project (fresh-project bootstrap)
  migrations/                 # 0005_nutrition, 0006_nutrition_hardening (0001–0004 predate this repo)
  functions/                  # strava-auth · strava-sync · coach   (Deno; excluded from tsc)
  README.md                   # secrets, deploy, auth setup
assets/                       # icon, adaptive icon, splash mark, favicon (generated; see design tokens)
public/                       # web shell: index.html template, manifest.json, icons
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

- `useAppStore` holds, per account (`hydrateForUser` swaps snapshots): race, profile, the current week (`DayPlan[]`),
  today's index, meals, custom foods, run-fuel counts, supplements taken, water, the Plan-tab suggestion state and
  the coach thread (`chat: ChatMessage[]` with `CoachProposal`s). Transient: `userId`, `cloudReady`, `coachBusy`.
- Coach proposals are one contract for both coaches: `changes` (what the UI strikes through) + either `apply`
  (local patches) or `cloudIds` (rows in `proposals`, applied by `decide_proposal`). Nothing mutates until approved.
- `targetsFor(day, profile)` → `{kcal, carbs, protein, fat}`. `protocolFor(day)` → before/during/after + carry list.
  The same engine is duplicated in `supabase/functions/strava-sync` (Deno) — change both or neither.
- Screens compute derived values in render (cheap) — keep it that way until there's a perf reason not to.
- Cloud writes are fire-and-forget through `swallow()`; reads happen once in `hydrateFromCloud()` and after
  `applyCoachProposals()`. Proposals are applied server-side by `decide_proposal()` — never mutate sessions directly.
- Database rules: RLS own-rows on every table; `integration_tokens` is unreadable by clients (service role only,
  AES-GCM encrypted); new tables get a `payload jsonb` column and a migration file, then regenerate types.

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

Done: persistence · accounts (Google / email code / guest) · Supabase schema + auth · plan builder v0 · Strava OAuth +
sync (edge function) · coach with structured proposals (Claude function + local fallback) · iOS build config ·
web export + Vercel config · custom foods + search on Log · Settings.

1. **Ship it** — `eas init` + first simulator build; import the repo on Vercel; set edge-function secrets;
   enable email OTP (+ Google provider). Then dogfood a full week in cloud mode and fix what hurts.
2. **Plan v1** — `lib/plan.ts` is deterministic and explainable but blind to history: seed `currentWeeklyMiles`
   from Strava/Health once connected, and let the coach function re-plan whole weeks (not just single sessions).
3. **Apple Health** — install the HealthKit module, implement `readRecentRuns()` in `lib/health.ts`, and feed it
   through the same match/deviation path as Strava (share the code in `strava-sync`, rename to `activity-sync`).
4. **Scheduled sync + pushes** — nightly `strava-sync` per user (pg_cron/net or Supabase cron), morning recap
   (`recap.tsx`) and post-run `plan-updated` as pushes (`expo-notifications`).
5. **Fuel engine v1** — replace the per-mile constants with HR-load–based fitness/fatigue (the "Training model"
   box in `design/product-flow.pdf`); keep targets explainable (the coach should be able to say *why*).
   Every proposal + outcome is already logged in `proposals` — that's the eval set.
6. **Food search / photo logging** — the search field and camera button on Log are wired to nothing yet.
7. **Tests** — Playwright smoke on the web export (the flow in `design/screens/` is the script), Vitest on `lib/fuel.ts`.

## Things to keep in mind

- The web build works (`npm run build:web`) and is how `design/screens/` was captured — useful for fast visual
  checks without a simulator. Serve `dist/` with an SPA fallback (Vercel does via `vercel.json`).
- `EXPO_PUBLIC_*` values are inlined by Metro and cached: after changing them run `expo start --clear` / `expo export --clear`.
- `src/lib/health.ts` requires its native module through a variable so Metro doesn't resolve it at bundle time; keep that.
- Edge functions are Deno; they're excluded from `tsc` (see `tsconfig.json`). Deploy with `npm run functions:deploy`.
- SVG gradient ids are made unique with `useId()` because several screens stay mounted; keep doing that.
- The floating tab bar is a custom `tabBar` on `expo-router` Tabs; the "+" circle routes to Log with `?add=1`.
- `npm run typecheck` depends on `.expo/types/router.d.ts` (git-ignored). Only `npx expo start` regenerates it — `expo export`
  does not — so on a fresh clone or after adding a route file, start the dev server once first or `tsc` fails on route strings.
- Live sign-in is by **personal code**: `src/data/members.ts` lists the runners, the code is that account's Supabase
  password (set/reset with the admin API — `supabase/README.md`), and public self-signup is disabled. The email-OTP and
  Google paths still exist in `lib/useAuth.ts` but the screen doesn't offer them; the built-in mailer is capped at
  2 emails/hour, which is why.- Strava tokens live on a cloud account, so guests can't connect Strava; the Welcome button routes them to sign-in.
  Apple Health is native-only and its button is hidden on web.
