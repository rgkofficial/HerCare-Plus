-- Task #8: persistent wellness management. Apply after 20261025_task08_wellness_entries.sql.
-- All tables are server-owned; clients never receive owner_id authority.

create table if not exists public.wellness_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  category text not null check (category in ('hydration','nutrition','activity','sleep','mood')),
  target numeric not null check (target > 0),
  unit text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, category)
);
create index if not exists wellness_goals_owner_idx on public.wellness_goals(owner_id, active);

create table if not exists public.wellness_habits (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  title text not null check (char_length(title) between 1 and 100),
  description text check (description is null or char_length(description) <= 500),
  frequency text not null default 'daily' check (frequency in ('daily','weekly')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists wellness_habits_owner_idx on public.wellness_habits(owner_id, active);

create table if not exists public.wellness_habit_completions (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  habit_id uuid not null references public.wellness_habits(id) on delete cascade,
  date date not null,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  unique(owner_id, habit_id, date)
);
create index if not exists wellness_habit_completions_owner_date_idx on public.wellness_habit_completions(owner_id, date desc);

create table if not exists public.wellness_journals (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  date date not null,
  mood integer not null check (mood between 1 and 5),
  stress integer not null check (stress between 1 and 5),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists wellness_journals_owner_date_idx on public.wellness_journals(owner_id, date desc);

create table if not exists public.wellness_preferences (
  owner_id text primary key,
  notifications_enabled boolean not null default false,
  cycle_integration_consent boolean not null default false,
  reminder_time time,
  updated_at timestamptz not null default now()
);

-- Defense in depth: no direct client table access. API routes use server-only service role.
DO $$ declare table_name text; begin
  FOREACH table_name IN ARRAY ARRAY['wellness_goals','wellness_habits','wellness_habit_completions','wellness_journals','wellness_preferences'] LOOP
    EXECUTE format('alter table public.%I enable row level security', table_name);
    EXECUTE format('revoke all on table public.%I from anon, authenticated', table_name);
    EXECUTE format('grant select, insert, update, delete on table public.%I to service_role', table_name);
  END LOOP;
END $$;
