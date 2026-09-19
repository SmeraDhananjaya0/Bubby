-- Bubbie — full Postgres schema (Supabase), generated from the live project on 2026-09-19.
--
-- The live project (ref vekgulejexranhdhecdp) already has every migration applied:
--   0001 schema · 0002 payload_columns · 0003 decide_proposal · 0004 profiles_insert_lockdown
--   0005 nutrition · 0006 nutrition_hardening
-- Use THIS file to stand up a fresh project from scratch (SQL editor or `psql -f`), and add new
-- changes as files under supabase/migrations/ (0005+ are in this repo).
--
-- Conventions: every table has RLS on with an "own rows" policy (auth.uid() = user_id);
-- `payload jsonb` carries app-shaped extras so the client types stay flexible;
-- the app's home timezone defaults to America/New_York for "today".

create extension if not exists pgcrypto;

-- ───────────────────────── tables ─────────────────────────

create table if not exists public.profiles (
  id uuid not null,
  email text not null,
  home_timezone text not null default 'America/New_York'::text,
  created_at timestamp with time zone not null default now(),
  display_name text,
  age integer,
  sex text,
  height_in numeric,
  weight_lb numeric,
  diet text,
  run_days_per_week integer default 5,
  onboarded_at timestamp with time zone,
  updated_at timestamp with time zone not null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade,
  constraint profiles_age_check check (age >= 10 and age <= 100),
  constraint profiles_height_in_check check (height_in >= 36 and height_in <= 96),
  constraint profiles_run_days_per_week_check check (run_days_per_week >= 1 and run_days_per_week <= 7),
  constraint profiles_sex_check check (sex = any (array['Female','Male','Other'])),
  constraint profiles_weight_lb_check check (weight_lb >= 60 and weight_lb <= 500)
);
alter table public.profiles enable row level security;

create table if not exists public.goals (
  id text not null,
  user_id uuid not null,
  name text not null,
  date date not null,
  target_seconds integer not null,
  payload jsonb not null default '{}'::jsonb,
  constraint goals_pkey primary key (id),
  constraint goals_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade
);
alter table public.goals enable row level security;

create table if not exists public.blocks (
  id text not null,
  user_id uuid not null,
  label text not null,
  phase text not null,
  week integer not null,
  total_weeks integer not null,
  periodization jsonb not null,
  payload jsonb not null default '{}'::jsonb,
  constraint blocks_pkey primary key (id),
  constraint blocks_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade
);
alter table public.blocks enable row level security;

create table if not exists public.planned_sessions (
  id text not null,
  user_id uuid not null,
  date date not null,
  title text not null,
  type text not null,
  detail text,
  structure jsonb not null default '[]'::jsonb,
  status text not null default 'planned'::text,
  provenance text not null default 'original'::text,
  payload jsonb not null,
  constraint planned_sessions_pkey primary key (user_id, id),
  constraint planned_sessions_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade
);
alter table public.planned_sessions enable row level security;

create table if not exists public.proposals (
  id text not null,
  user_id uuid not null,
  scope text not null,
  session_id text not null,
  status text not null default 'proposed'::text,
  decided_at timestamp with time zone,
  payload jsonb not null,
  constraint proposals_pkey primary key (user_id, id),
  constraint proposals_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade
);
alter table public.proposals enable row level security;

create table if not exists public.activities (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  strava_id bigint,
  whoop_id text,
  sport text not null,
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone not null,
  distance_m numeric,
  moving_sec integer,
  avg_pace_sec_per_mi numeric,
  avg_hr integer,
  max_hr integer,
  strain numeric,
  hr_zones jsonb,
  matched_session_id text,
  payload jsonb not null default '{}'::jsonb,
  constraint activities_pkey primary key (id),
  constraint activities_strava_id_key unique (strava_id),
  constraint activities_whoop_id_key unique (whoop_id),
  constraint activities_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade
);
alter table public.activities enable row level security;

create table if not exists public.run_logs (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  session_id text,
  activity_id uuid,
  rpe integer not null,
  pain jsonb,
  logged_at timestamp with time zone not null default now(),
  constraint run_logs_pkey primary key (id),
  constraint run_logs_activity_id_fkey foreign key (activity_id) references activities(id),
  constraint run_logs_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade,
  constraint run_logs_rpe_check check (rpe >= 1 and rpe <= 10)
);
alter table public.run_logs enable row level security;

create table if not exists public.recovery_snapshots (
  user_id uuid not null,
  day date not null,
  recovery_pct integer,
  hrv_ms numeric,
  rhr integer,
  day_strain numeric,
  sleep jsonb,
  source text not null default 'whoop'::text,
  synced_at timestamp with time zone not null default now(),
  payload jsonb not null default '{}'::jsonb,
  constraint recovery_snapshots_pkey primary key (user_id, day),
  constraint recovery_snapshots_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade
);
alter table public.recovery_snapshots enable row level security;

create table if not exists public.chat_messages (
  id text not null,
  user_id uuid not null,
  role text not null,
  body text not null,
  time_label text,
  proposal_refs jsonb,
  seq integer not null,
  payload jsonb not null default '{}'::jsonb,
  constraint chat_messages_pkey primary key (user_id, id),
  constraint chat_messages_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade
);
alter table public.chat_messages enable row level security;

create table if not exists public.pain_areas (
  id text not null,
  user_id uuid not null,
  name text not null,
  severity integer not null,
  trend text not null,
  payload jsonb not null,
  constraint pain_areas_pkey primary key (user_id, id),
  constraint pain_areas_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade
);
alter table public.pain_areas enable row level security;

create table if not exists public.pain_logs (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  area_id text not null,
  severity integer not null,
  note text,
  logged_at timestamp with time zone not null default now(),
  constraint pain_logs_pkey primary key (id),
  constraint pain_logs_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade,
  constraint pain_logs_severity_check check (severity >= 0 and severity <= 10)
);
alter table public.pain_logs enable row level security;

-- OAuth tokens, encrypted with AES-256-GCM in the edge functions (TOKEN_ENC_KEY). Never readable by clients.
create table if not exists public.integration_tokens (
  user_id uuid not null,
  provider text not null,
  ciphertext text not null,
  iv text not null,
  tag text not null,
  expires_at timestamp with time zone,
  athlete_ref text,
  updated_at timestamp with time zone not null default now(),
  constraint integration_tokens_pkey primary key (user_id, provider),
  constraint integration_tokens_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade,
  constraint integration_tokens_provider_check check (provider = any (array['whoop','strava','apple_health']))
);
alter table public.integration_tokens enable row level security;

create table if not exists public.sync_runs (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  source text not null,
  ok boolean not null,
  detail text,
  items integer not null default 0,
  ran_at timestamp with time zone not null default now(),
  constraint sync_runs_pkey primary key (id),
  constraint sync_runs_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade
);
alter table public.sync_runs enable row level security;

-- Nutrition (0005)
create table if not exists public.meals (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  day date not null default ((now() at time zone 'America/New_York'))::date,
  eaten_at timestamp with time zone not null default now(),
  slot text not null,
  kind text not null default 'meal'::text,
  description text not null,
  kcal integer not null,
  carbs_g numeric not null default 0,
  protein_g numeric not null default 0,
  fat_g numeric not null default 0,
  sodium_mg numeric,
  source text not null default 'manual'::text,
  payload jsonb not null default '{}'::jsonb,
  constraint meals_pkey primary key (id),
  constraint meals_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade,
  constraint meals_kcal_check check (kcal >= 0),
  constraint meals_carbs_g_check check (carbs_g >= 0),
  constraint meals_protein_g_check check (protein_g >= 0),
  constraint meals_fat_g_check check (fat_g >= 0),
  constraint meals_kind_check check (kind = any (array['meal','run_fuel'])),
  constraint meals_source_check check (source = any (array['manual','quick_add','photo','search','apple_health']))
);
alter table public.meals enable row level security;
create index if not exists meals_user_day_idx on public.meals using btree (user_id, day);

create table if not exists public.supplement_logs (
  user_id uuid not null,
  day date not null default ((now() at time zone 'America/New_York'))::date,
  name text not null,
  dose text,
  taken_at timestamp with time zone not null default now(),
  constraint supplement_logs_pkey primary key (user_id, day, name),
  constraint supplement_logs_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade
);
alter table public.supplement_logs enable row level security;

create table if not exists public.hydration_logs (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  day date not null default ((now() at time zone 'America/New_York'))::date,
  ml integer not null,
  logged_at timestamp with time zone not null default now(),
  constraint hydration_logs_pkey primary key (id),
  constraint hydration_logs_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade
);
alter table public.hydration_logs enable row level security;
create index if not exists hydration_logs_user_day_idx on public.hydration_logs using btree (user_id, day);

create table if not exists public.daily_targets (
  user_id uuid not null,
  day date not null,
  kcal integer not null,
  carbs_g integer not null,
  protein_g integer not null,
  fat_g integer not null,
  sodium_mg integer,
  session_id text,
  engine_version text not null default 'v0'::text,
  reason text,
  computed_at timestamp with time zone not null default now(),
  payload jsonb not null default '{}'::jsonb,
  constraint daily_targets_pkey primary key (user_id, day),
  constraint daily_targets_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade
);
alter table public.daily_targets enable row level security;

-- ───────────────────────── row level security ─────────────────────────

-- profiles: rows are created by the auth trigger only (0004 lockdown) — no client insert policy.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles for delete using (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array['goals','blocks','planned_sessions','proposals','activities','run_logs','recovery_snapshots',
                           'chat_messages','pain_areas','pain_logs','sync_runs','meals','supplement_logs','hydration_logs','daily_targets']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_own', t);
    execute format('create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_own', t);
  end loop;
end $$;

-- tokens: deny everything to clients; edge functions use the service role.
drop policy if exists integration_tokens_no_client on public.integration_tokens;
create policy integration_tokens_no_client on public.integration_tokens for all using (false) with check (false);

-- ───────────────────────── functions & triggers ─────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$function$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.connected_providers()
returns text[]
language sql
stable security definer
set search_path to 'public'
as $function$
  select coalesce(array_agg(provider order by provider), '{}')
  from public.integration_tokens where user_id = auth.uid();
$function$;
revoke execute on function public.connected_providers() from public, anon;
grant execute on function public.connected_providers() to authenticated;

create or replace function public.nutrition_day(p_day date default ((now() at time zone 'America/New_York'))::date)
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
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
$function$;
grant execute on function public.nutrition_day(date) to authenticated;

-- Apply / dismiss a coach or sync proposal atomically. Called via supabase.rpc('decide_proposal', …).
create or replace function public.decide_proposal(p_id text, p_decision text, p_modified jsonb default null::jsonb)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_prop proposals%rowtype;
  v_target jsonb;
  v_old_id text;
  v_new_id text;
begin
  select * into v_prop from proposals where id = p_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'proposal not found';
  end if;

  if v_prop.status <> 'proposed' then
    raise exception 're-decide guard: proposal already %', v_prop.status;
  end if;

  if p_decision not in ('accepted', 'modified', 'dismissed', 'overridden') then
    raise exception 'bad decision: %', p_decision;
  end if;

  update proposals
    set status = case when p_decision = 'overridden' then 'dismissed' else p_decision end,
        decided_at = now()
    where id = p_id and user_id = auth.uid();

  if p_decision in ('accepted', 'modified') then
    v_target := coalesce(p_modified, v_prop.payload -> 'after');
    v_old_id := v_prop.session_id;
    v_new_id := v_target ->> 'id';

    update planned_sessions s set
      id = v_new_id,
      date = (v_target ->> 'date')::date,
      title = v_target ->> 'title',
      type = v_target ->> 'type',
      detail = v_target ->> 'detail',
      structure = coalesce(v_target -> 'structure', '[]'::jsonb),
      status = coalesce(v_target ->> 'status', s.status),
      provenance = case when p_decision = 'accepted' then 'accepted-proposal' else 'modified-proposal' end,
      payload = jsonb_strip_nulls(jsonb_build_object(
        'distanceMi', v_target -> 'distanceMi',
        'paceTarget', v_target -> 'paceTarget',
        'zone', v_target -> 'zone',
        'movedFromId', case when v_new_id <> v_old_id then to_jsonb(v_old_id) else null::jsonb end
      ))
      where s.user_id = auth.uid() and s.id = v_old_id;

    if not found then
      raise exception 'target session not found: %', v_old_id;
    end if;

    update proposals set status = 'expired', decided_at = now()
      where user_id = auth.uid() and session_id = v_prop.session_id
        and id <> p_id and status = 'proposed';
  end if;
end;
$function$;
grant execute on function public.decide_proposal(text, text, jsonb) to authenticated;
