# Bubbie

**Train for it. *Eat for it.*** — a marathon / half-marathon training app where fuel adjusts to every run you do.

Calories and carbs follow the day's workout, protein stays steady, and the coach re-plans when a run differs,
intake is off, or you tell it something changed. You approve every change.

<p>
  <img src="design/screens/01-welcome.png" width="180" alt="Welcome">
  <img src="design/screens/06-today.png" width="180" alt="Today">
  <img src="design/screens/08-plan.png" width="180" alt="Plan">
  <img src="design/screens/09-log.png" width="180" alt="Log">
</p>

One codebase, three targets: **iOS** (native, via EAS), **web** (PWA, via Vercel) and Android.
Backend is **Supabase** (Postgres + RLS, email-OTP auth, three edge functions) — see [`supabase/README.md`](supabase/README.md).

## Run it locally

```bash
npm install
npx expo start          # i → iOS simulator · w → browser · a → Android
npm run typecheck       # must pass before every commit
```

With no `.env`, the app runs in **local mode**: sample data, everything persisted on-device, no account.
Copy `.env.example` → `.env` to talk to the real backend in development (production builds already do,
via `.env.production`). Changed an `EXPO_PUBLIC_*` value? Restart with `npx expo start --clear` — they're inlined.

## iOS

The project is configured for EAS Build (bundle id `app.bubbie.run`, HealthKit entitlement + usage strings,
camera/photos strings, app icon, splash, `usesNonExemptEncryption: false`). `npx expo prebuild --platform ios`
generates a clean Xcode project; `ios/` is git-ignored and regenerated on every build.

```bash
npm i -g eas-cli && eas login
eas init                       # links this repo to your Expo account (adds extra.eas.projectId to app.json)
npm run build:ios:sim          # dev client for the simulator — fastest loop, no Apple account needed
npm run build:ios:dev          # dev client on your iPhone (internal distribution)
npm run build:ios:preview      # TestFlight-style internal build
npm run build:ios              # App Store build (auto-increments build number)
npm run submit:ios             # → App Store Connect
```

Profiles live in `eas.json` and already carry the public Supabase config. First `eas build -p ios` walks you
through Apple Developer credentials; EAS syncs the HealthKit capability from the entitlements automatically.

**Apple Health** — the entitlement and adapter (`src/lib/health.ts`) are in place; reading workouts needs the
native module: `npx expo install @kingstinct/react-native-healthkit`, add it to `plugins` in `app.json`,
rebuild the dev client. Until then the "Connect Apple Health" button falls through gracefully.

## Web

`npm run build:web` exports a static SPA to `dist/` (`public/index.html` is the shell, `public/manifest.json`
makes it installable). `vercel.json` carries the build command, output dir, SPA rewrite and cache headers, and
`.env.production` carries the public Supabase config — so deploying is one import:

1. Push `main`.
2. [vercel.com/new](https://vercel.com/new) → import `SmeraDhananjaya0/Bubby` → **Deploy** (no settings to change).

Or from a terminal: `npx vercel --prod`. On desktop widths the app renders in a 430px phone frame.

## Backend

Supabase project `vekgulejexranhdhecdp`. Schema, functions and secrets are documented in
[`supabase/README.md`](supabase/README.md). Short version of what's left to flip on:

- **Auth → Email**: done — provider enabled, the *Magic Link* template carries `{{ .Token }}` (source in
  `supabase/templates/sign-in-code.html`), OTP length 6. Built-in SMTP allows **2 emails/hour** — set up custom SMTP
  (Dashboard → Auth → SMTP) before real users.
- **Auth → Google** (optional): enable the provider with a Google OAuth client, and add `bubbie://auth` plus your
  web origin to *Redirect URLs*. Until then the Google button explains and email still works.
- **Secrets**: `supabase secrets set STRAVA_CLIENT_ID STRAVA_CLIENT_SECRET TOKEN_ENC_KEY ANTHROPIC_API_KEY`.
- **Strava app**: callback domain `bubbie` + your web domain; client id → `EXPO_PUBLIC_STRAVA_CLIENT_ID`.

## What's here

- **Accounts** — Google, email code (no password) or guest; several people can share a device. Signed-in data
  syncs through Supabase; guests keep everything on-device
- **Onboarding** — connect Strava / Apple Health, profile, goal race, plan preview → a real periodized block is
  built for your race date and run days (`src/lib/plan.ts`)
- **Today** — goal race countdown, calorie / carb / protein rings against today's targets, the workout,
  the before / during / after fueling protocol, week vs. plan, tomorrow, recovery
- **Plan** — the week (tap a day), an adaptive suggestion you can apply, the whole training block
- **Log** — what's left today, run fuel (gels, chews, drink, salt) and supplements (creatine…), meals, hydration, micros
- **Coach** — chat that changes your plan only when you approve: Claude (edge function) when signed in, a
  rule-based coach on-device otherwise (injury, illness, travel, fatigue, fueling and pace questions)
- **Settings** — account, profile and race shortcuts, reset, sign out
- **Sheets** — *Plan updated* (a run synced from Strava changed the plan) and *Yesterday* (morning recap)

## Working on it with Claude Code

Open the folder in Claude Code. `CLAUDE.md` carries the design rules, repo map, state model and roadmap;
`design/DESIGN.md` is the visual spec; `design/canvas/` are the original wireframes.
