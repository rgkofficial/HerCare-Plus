create extension if not exists pgcrypto;

alter table if exists public.medical_records
  add column if not exists scan_status text not null default 'clean',
  add column if not exists scan_provider text,
  add column if not exists quarantine_reason text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.medical_records drop constraint if exists medical_records_category_check;
alter table public.medical_records add constraint medical_records_category_check check (category in ('prescription','lab_report','imaging','discharge_summary','consultation_note','womens_health','vaccination','medical_report','other'));
alter table public.medical_records add constraint medical_records_scan_status_check check (scan_status in ('pending','clean','quarantined','failed'));
create index if not exists medical_records_owner_category_idx on public.medical_records(owner_id, category, created_at desc);

create table if not exists public.medical_profiles (
  id uuid primary key default gen_random_uuid(), owner_id text not null unique,
  blood_group text check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown')),
  allergies text[] not null default '{}', chronic_conditions text[] not null default '{}',
  past_surgeries text[] not null default '{}', family_history text,
  emergency_contact_name text, emergency_contact_phone text,
  cycle_notes text, gynecological_history text, pregnancy_history text,
  confirmation_status text not null default 'user_reported' check (confirmation_status in ('user_reported','clinician_confirmed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists medical_profiles_owner_idx on public.medical_profiles(owner_id);

create table if not exists public.medical_medications (
  id uuid primary key default gen_random_uuid(), owner_id text not null,
  name text not null check (char_length(name) between 1 and 160), dosage text,
  frequency text, start_date date, end_date date, prescribing_clinician text,
  status text not null default 'current' check (status in ('current','completed','discontinued')),
  confirmation_status text not null default 'user_reported' check (confirmation_status in ('user_reported','clinician_confirmed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists medical_medications_owner_status_idx on public.medical_medications(owner_id, status, updated_at desc);

create table if not exists public.medical_visits (
  id uuid primary key default gen_random_uuid(), owner_id text not null,
  visit_date date not null, provider text, reason text not null, notes text,
  follow_up_date date, confirmation_status text not null default 'user_reported' check (confirmation_status in ('user_reported','clinician_confirmed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists medical_visits_owner_date_idx on public.medical_visits(owner_id, visit_date desc);

alter table public.medical_profiles enable row level security;
alter table public.medical_medications enable row level security;
alter table public.medical_visits enable row level security;
revoke all on medical_profiles, medical_medications, medical_visits from anon, authenticated;
grant select, insert, update, delete on medical_profiles, medical_medications, medical_visits to service_role;
