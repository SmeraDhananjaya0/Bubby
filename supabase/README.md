# Bubbie backend (Supabase)

Project: **marathon-training-app** · ref `vekgulejexranhdhecdp` · Postgres 17 · region us-east.
URL `https://vekgulejexranhdhecdp.supabase.co` — the publishable key is in `.env.production`.

## What's deployed

| Piece | Where | Status |
|---|---|---|
| Schema (17 tables, RLS own-rows, `decide_proposal`, `nutrition_day`, `connected_providers`, auth → profile trigger) | `schema.sql` (full), `migrations/0005–0006` (this repo's additions) | applied |
| `strava-auth` edge function — OAuth code → encrypted tokens | `functions/strava-auth` | deployed v1 |
| `strava-sync` edge function — pull runs, match to plan, propose fuel changes, write `daily_targets` | `functions/strava-sync` | deployed v1 |
| `coach` edge function — Claude with the `propose_plan_changes` tool; persists chat + proposals | `functions/coach` | deployed v1 |
| Auth — email OTP (six-digit code) + optional Google | Dashboard → Authentication | Email enabled; Magic Link template = `templates/sign-in-code.html` (carries `{{ .Token }}`), OTP length 6. Google provider + `bubbie://auth` redirect: not yet |

## Secrets the functions need (set once)

```bash
supabase link --project-ref vekgulejexranhdhecdp
supabase secrets set \
  STRAVA_CLIENT_ID=… \
  STRAVA_CLIENT_SECRET=… \
  TOKEN_ENC_KEY="$(openssl rand -base64 32)" \
  ANTHROPIC_API_KEY=… \
  COACH_MODEL=claude-sonnet-4-5
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.
Strava: create an API app at strava.com/settings/api with **Authorization Callback Domain** = `bubbie` (native)
and your web domain; put the client id in `EXPO_PUBLIC_STRAVA_CLIENT_ID`.

## Testing sign-in without email

The built-in SMTP sends at most 2 emails/hour. To get a valid six-digit code without sending one:

```bash
KEY=$(supabase projects api-keys --project-ref vekgulejexranhdhecdp -o json | jq -r '.[]|select(.name=="service_role").api_key')
curl -s -X POST https://vekgulejexranhdhecdp.supabase.co/auth/v1/admin/generate_link \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"type":"magiclink","email":"you@example.com"}' | jq .email_otp
```

The user must already exist; the code expires after `mailer_otp_exp` (60 min).

## Day-to-day

```bash
npm run db:push            # apply new files in supabase/migrations to the linked project
npm run functions:deploy   # redeploy all three functions
supabase functions serve   # run them locally against the linked project
```

Client access goes through `src/data/repo.ts` only; screens never import supabase-js directly.
Types in `src/lib/database.types.ts` are hand-condensed — regenerate with
`supabase gen types typescript --linked > src/lib/database.types.ts` after schema changes.

## Scheduling the Strava sync

`strava-sync` accepts a service-role call with `{ user_id }`. To sync everyone nightly, add a cron job
(Dashboard → Integrations → Cron) that calls the function per user with connected Strava, or a pg_cron job
that iterates `integration_tokens where provider = 'strava'` and uses `net.http_post`.
