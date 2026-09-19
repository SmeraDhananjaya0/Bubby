-- 0005_nutrition
-- Bubbie: fuel follows the workout. Adds everything the Log / Nutrients / Today
-- screens need on top of the existing training schema (goals, blocks,
-- planned_sessions, proposals, activities, recovery_snapshots, chat_messages).
--
-- Conventions kept from 0001–0004: one row per user-owned thing, `user_id`
-- FK to profiles, RLS "own rows only", jsonb `payload` for the long tail.

-- ---------------------------------------------------------------------------
-- profiles: body metrics the fuel engine needs, plus onboarding state
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists age integer check (age between 10 and 100),
  add column if not exists sex text check (sex in ('Female', 'Male', 'Other')),
  add column if not exists height_in numeric check (height_in between 36 and 96),
  add column if not exists weight_lb numeric check (weight_lb between 60 and 500),
  add column if not exists diet text,
  add column if not exists run_days_per_week integer default 5 check (run_days_per_week between 1 and 7),
  add column if not exists onboarded_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Every auth signup gets a profile row (inserts on profiles stay locked down
-- for clients; only this security-definer trigger writes them).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- meals: anything eaten, including run fuel (kind = 'run_fuel')
-- ---------------------------------------------------------------------------
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default (now() at time zone 'America/New_York')::date,
  eaten_at timestamptz not null default now(),
  slot text not null,                       -- Breakfast, Lunch, Dinner, Snack, Post-run, Run fuel …
  kind text not null default 'meal' check (kind in ('meal', 'run_fuel')),
  description text not null,
  kcal integer not null check (kcal >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  sodium_mg numeric,
  source text not null default 'manual' check (source in ('manual', 'quick_add', 'photo', 'search', 'apple_health')),
  payload jsonb not null default '{}'::jsonb
);
create index if not exists meals_user_day_idx on public.meals (user_id, day);
alter table public.meals enable row level security;
drop policy if exists meals_own on public.meals;
create policy meals_own on public.meals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- supplement_logs: one row per supplement per day when taken
-- ---------------------------------------------------------------------------
create table if not exists public.supplement_logs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default (now() at time zone 'America/New_York')::date,
  name text not null,                       -- Creatine, Vitamin D, Electrolytes, Omega-3, Iron
  dose text,
  taken_at timestamptz not null default now(),
  primary key (user_id, day, name)
);
alter table public.supplement_logs enable row level security;
drop policy if exists supplement_logs_own on public.supplement_logs;
create policy supplement_logs_own on public.supplement_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- hydration_logs: +/- millilitres, summed per day
-- ---------------------------------------------------------------------------
create table if not exists public.hydration_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default (now() at time zone 'America/New_York')::date,
  ml integer not null,
  logged_at timestamptz not null default now()
);
create index if not exists hydration_logs_user_day_idx on public.hydration_logs (user_id, day);
alter table public.hydration_logs enable row level security;
drop policy if exists hydration_logs_own on public.hydration_logs;
create policy hydration_logs_own on public.hydration_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- daily_targets: what the fuel engine decided for a day, and why.
-- Written by the app (v0, engine runs client-side) or by an edge function
-- (v1). Keeping a row per day makes "Plan updated: today we added +520 kcal"
-- an honest diff and gives the eval set its ground truth.
-- ---------------------------------------------------------------------------
create table if not exists public.daily_targets (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  kcal integer not null,
  carbs_g integer not null,
  protein_g integer not null,
  fat_g integer not null,
  sodium_mg integer,
  session_id text,                          -- planned_sessions.id the targets were computed from
  engine_version text not null default 'v0',
  reason text,                              -- one line the coach can quote
  computed_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  primary key (user_id, day)
);
alter table public.daily_targets enable row level security;
drop policy if exists daily_targets_own on public.daily_targets;
create policy daily_targets_own on public.daily_targets for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- integration_tokens: allow Apple Health as a provider marker (no token, just
-- "connected") so the Today screen can show the source.
-- ---------------------------------------------------------------------------
alter table public.integration_tokens drop constraint if exists integration_tokens_provider_check;
alter table public.integration_tokens
  add constraint integration_tokens_provider_check
  check (provider in ('whoop', 'strava', 'apple_health'));

-- ---------------------------------------------------------------------------
-- nutrition_day: one call gives the Log / Today screens everything for a day
-- ---------------------------------------------------------------------------
create or replace function public.nutrition_day(p_day date default (now() at time zone 'America/New_York')::date)
returns jsonb
language sql
stable
security invoker
as $$
  select jsonb_build_object(
    'day', p_day,
    'eaten', (
      select jsonb_build_object(
        'kcal', coalesce(sum(kcal), 0),
        'carbs_g', coalesce(sum(carbs_g), 0),
        'protein_g', coalesce(sum(protein_g), 0),
        'fat_g', coalesce(sum(fat_g), 0),
        'sodium_mg', coalesce(sum(sodium_mg), 0)
      ) from public.meals where user_id = auth.uid() and day = p_day
    ),
    'meals', (
      select coalesce(jsonb_agg(to_jsonb(m) order by m.eaten_at), '[]'::jsonb)
      from public.meals m where m.user_id = auth.uid() and m.day = p_day
    ),
    'supplements', (
      select coalesce(jsonb_agg(name order by taken_at), '[]'::jsonb)
      from public.supplement_logs where user_id = auth.uid() and day = p_day
    ),
    'water_ml', (
      select coalesce(sum(ml), 0) from public.hydration_logs where user_id = auth.uid() and day = p_day
    ),
    'targets', (
      select to_jsonb(t) from public.daily_targets t where t.user_id = auth.uid() and t.day = p_day
    )
  );
$$;

grant execute on function public.nutrition_day(date) to authenticated;
