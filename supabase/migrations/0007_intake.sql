-- 0007_intake: vitals, level, notes and a reference race on the profile; goal mode on the goal.
alter table public.profiles
  add column if not exists max_hr integer check (max_hr between 100 and 230),
  add column if not exists resting_hr integer check (resting_hr between 30 and 120),
  add column if not exists level text check (level in ('new', 'intermediate', 'advanced')),
  add column if not exists recent_race jsonb,
  add column if not exists notes text check (char_length(notes) <= 500);

alter table public.goals
  add column if not exists mode text not null default 'time' check (mode in ('time', 'finish'));
