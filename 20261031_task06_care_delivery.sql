-- Task 6: provider discovery, availability and appointment lifecycle.
-- Apply after configuring the application identity adapter. The API must set
-- app.user_id and app.user_role from a verified session before querying.
create extension if not exists btree_gist;

create table if not exists public.provider_profiles (
  id text primary key,
  display_name text not null,
  credentials text not null,
  specialty text not null,
  clinic_name text not null,
  city text not null,
  timezone text not null default 'Asia/Kolkata',
  telehealth boolean not null default false,
  consultation_fee integer not null check (consultation_fee >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.provider_profiles(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'Asia/Kolkata',
  status text not null default 'available' check (status in ('available', 'blocked')),
  check (ends_at > starts_at),
  unique (provider_id, starts_at)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null,
  provider_id text not null references public.provider_profiles(id) on delete restrict,
  slot_id uuid not null references public.availability_slots(id) on delete restrict,
  mode text not null check (mode in ('video', 'clinic')),
  status text not null default 'held' check (status in ('held', 'confirmed', 'rescheduled', 'cancelled', 'completed')),
  reason text not null check (char_length(reason) between 1 and 500),
  patient_notes text check (patient_notes is null or char_length(patient_notes) <= 1000),
  consent_accepted_at timestamptz not null,
  meeting_url text,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists appointments_active_slot_unique
  on public.appointments (slot_id)
  where status in ('held', 'confirmed', 'rescheduled');
create index if not exists appointments_patient_idx on public.appointments (patient_id, created_at desc);
create index if not exists appointments_provider_idx on public.appointments (provider_id, status, created_at desc);

alter table public.provider_profiles enable row level security;
alter table public.availability_slots enable row level security;
alter table public.appointments enable row level security;

-- Provider discovery and open availability are public product data.
drop policy if exists provider_profiles_read on public.provider_profiles;
create policy provider_profiles_read on public.provider_profiles for select using (active = true);
drop policy if exists availability_read on public.availability_slots;
create policy availability_read on public.availability_slots for select using (status = 'available' and starts_at > now());

-- Health-related appointment rows are restricted to the patient or assigned provider.
drop policy if exists appointments_read_own on public.appointments;
create policy appointments_read_own on public.appointments for select using (
  patient_id = current_setting('app.user_id', true)
  or provider_id = current_setting('app.user_id', true)
);
drop policy if exists appointments_insert_patient on public.appointments;
create policy appointments_insert_patient on public.appointments for insert with check (
  patient_id = current_setting('app.user_id', true)
  and current_setting('app.user_role', true) = 'patient'
  and consent_accepted_at is not null
);
drop policy if exists appointments_update_participant on public.appointments;
create policy appointments_update_participant on public.appointments for update using (
  patient_id = current_setting('app.user_id', true)
  or (provider_id = current_setting('app.user_id', true) and current_setting('app.user_role', true) = 'provider')
) with check (
  patient_id = current_setting('app.user_id', true)
  or (provider_id = current_setting('app.user_id', true) and current_setting('app.user_role', true) = 'provider')
);
