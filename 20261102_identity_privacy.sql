create extension if not exists pgcrypto;

create table if not exists public.identity_tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Personal care space',
  created_at timestamptz not null default now(),
  anonymized_at timestamptz
);

create table if not exists public.identity_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.identity_tenants(id) on delete cascade,
  email text not null,
  display_name text,
  password_hash text,
  role text not null default 'patient' check (role in ('patient','clinician','specialist','administrator')),
  status text not null default 'active' check (status in ('active','suspended','anonymized')),
  permission_version integer not null default 1,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email)
);
create unique index if not exists identity_users_email_idx on public.identity_users(lower(email));

create table if not exists public.privacy_preferences (
  user_id uuid primary key references public.identity_users(id) on delete cascade,
  marketing_opt_in boolean not null default false,
  analytics_opt_in boolean not null default false,
  sync_opt_in boolean not null default false,
  data_retention_days integer not null default 365 check (data_retention_days in (30,90,365,0)),
  updated_at timestamptz not null default now()
);

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.identity_tenants(id) on delete cascade,
  user_id uuid not null references public.identity_users(id) on delete cascade,
  purpose text not null check (purpose in ('care_access','data_sync','analytics','communications')),
  status text not null check (status in ('granted','withdrawn')),
  version text not null,
  recorded_at timestamptz not null default now(),
  withdrawn_at timestamptz
);
create index if not exists consent_records_user_idx on public.consent_records(user_id, recorded_at desc);

create table if not exists public.provider_access_grants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.identity_tenants(id) on delete cascade,
  patient_id uuid not null references public.identity_users(id) on delete cascade,
  provider_id uuid not null references public.identity_users(id) on delete cascade,
  provider_role text not null check (provider_role in ('clinician','specialist')),
  permissions text[] not null default array['health:read:shared'],
  status text not null default 'active' check (status in ('active','revoked')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  expires_at timestamptz
);
create index if not exists access_grants_patient_idx on public.provider_access_grants(patient_id, status);

create table if not exists public.privacy_access_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.identity_tenants(id) on delete cascade,
  actor_id uuid references public.identity_users(id) on delete set null,
  subject_id uuid references public.identity_users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  ip_hash text,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists privacy_access_events_subject_idx on public.privacy_access_events(subject_id, created_at desc);

create table if not exists public.identity_login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.identity_users(id) on delete set null,
  tenant_id uuid references public.identity_tenants(id) on delete set null,
  email_hash text not null,
  success boolean not null,
  suspicious boolean not null default false,
  ip_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.identity_recovery_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.identity_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.identity_tenants enable row level security;
alter table public.identity_users enable row level security;
alter table public.privacy_preferences enable row level security;
alter table public.consent_records enable row level security;
alter table public.provider_access_grants enable row level security;
alter table public.privacy_access_events enable row level security;
alter table public.identity_login_events enable row level security;
alter table public.identity_recovery_tokens enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
