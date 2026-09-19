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
| Auth — personal codes (password auth; `src/data/members.ts`) | admin API, see below | two runners provisioned; `disable_signup = true`. Email OTP template (`templates/sign-in-code.html`) and Google stay available but unused |

## Secrets the functions need (set once)

```bash
supabase link --project-ref vekgulejexranhdhecdp
supabase secrets set \
  STRAVA_CLIENT_ID=… \
  STRAVA_CLIENT_SECRET=… \
  TOKEN_ENC_KEY="$(openssl rand -base64 32)" \
  ANTHROPIC_API_KEY=… \
  COACH_MODEL=claude-sonnet-5
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.
Strava: create an API app at strava.com/settings/api with **Authorization Callback Domain** = the web domain
(`bubbie-flax.vercel.app` — Strava allows exactly one); put the client id in `EXPO_PUBLIC_STRAVA_CLIENT_ID`.

## Sign-in codes

Each runner in `src/data/members.ts` has an auth user whose password is their code (8 characters from
`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, shown as `XXXX-XXXX`; the app strips the hyphen). The addresses are synthetic
(`<name>@bubbie.run`) — nothing is ever emailed. To reset a code or add a runner:

```bash
KEY=$(supabase projects api-keys --project-ref vekgulejexranhdhecdp -o json | jq -r '.[]|select(.name=="service_role").api_key')
H=(-H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json")
# reset: PUT /auth/v1/admin/users/<uid>            {"password":"NEWCODE8"}
# add:   POST /auth/v1/admin/users                 {"email":"name@bubbie.run","email_confirm":true,"password":"CODE","user_metadata":{"name":"Name"}}
#        then add the runner to src/data/members.ts and set profiles.display_name
```

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
