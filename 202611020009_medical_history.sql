-- Structured medical history for HerCare+.
-- Apply after 202610260001_medical_records.sql.
create table if not exists public.medical_profiles (
  owner_id text primary key,
  blood_group text check (blood_group is null or blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown')),
  allergies text not null default '',
  chronic_conditions text not null default '',
  surgeries text not null default '',
  family_history text not null default '',
  emergency_contact_name text not null default '',
  emergency_contact_phone text not null default '',
  cycle_history text not null default '',
  gynecological_history text not null default '',
  updated_at timestamptz not null default now(),
  constraint medical_profiles_text_limits check (
    length(allergies) <= 4000 and length(chronic_conditions) <= 4000 and
    length(surgeries) <= 4000 and length(family_history) <= 4000 and
    length(emergency_contact_name) <= 160 and length(emergency_contact_phone) <= 40 and
    length(cycle_history) <= 4000 and length(gynecological_history) <= 4000
  )
);
create table if not exists public.medical_medications (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null,
  dosage text not null default '',
  frequency text not null default '',
  start_date date,
  end_date date,
  prescribing_clinician text not null default '',
  status text not null default 'current' check (status in ('current', 'completed', 'discontinued')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint medical_medications_name_limit check (length(name) between 1 and 200),
  constraint medical_medications_dates check (end_date is null or start_date is null or end_date >= start_date)
);
create index if not exists medical_medications_owner_status_idx on public.medical_medications (owner_id, status, updated_at desc);
create table if not exists public.medical_visits (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  visit_date date not null,
  clinician text not null default '',
  specialty text not null default '',
  reason text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint medical_visits_text_limits check (length(clinician) <= 200 and length(specialty) <= 160 and length(reason) <= 1000 and length(notes) <= 6000)
);
create index if not exists medical_visits_owner_date_idx on public.medical_visits (owner_id, visit_date desc, created_at desc);

-- Service-role routes enforce owner_id. Direct browser access is disabled.
alter table public.medical_record_audit_logs drop constraint if exists medical_record_audit_logs_action_check;
alter table public.medical_record_audit_logs add constraint medical_record_audit_logs_action_check check (action in ('upload', 'download', 'delete', 'export'));
alter table public.medical_profiles enable row level security;
alter table public.medical_medications enable row level security;
alter table public.medical_visits enable row level security;
revoke all on public.medical_profiles from anon, authenticated;
revoke all on public.medical_medications from anon, authenticated;
revoke all on public.medical_visits from anon, authenticated;
create or replace function public.set_medical_history_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists medical_profiles_updated_at on public.medical_profiles;
create trigger medical_profiles_updated_at before update on public.medical_profiles for each row execute function public.set_medical_history_updated_at();
drop trigger if exists medical_medications_updated_at on public.medical_medications;
create trigger medical_medications_updated_at before update on public.medical_medications for each row execute function public.set_medical_history_updated_at();
