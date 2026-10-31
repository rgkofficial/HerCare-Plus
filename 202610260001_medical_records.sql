-- Proposed schema migration for HerCare Plus.
-- Verify against the live database before applying.

create extension if not exists pgcrypto;

create table if not exists public.medical_records (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  file_name text not null,
  storage_path text not null unique,
  category text not null default 'other'
    check (category in ('prescription', 'lab_report', 'medical_report', 'other')),
  content_type text not null
    check (content_type in ('application/pdf', 'image/jpeg', 'image/png')),
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  version_number integer not null default 1 check (version_number >= 1),
  previous_version_id uuid references public.medical_records(id) on delete restrict,
  retention_until timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists medical_records_owner_created_idx
  on public.medical_records (owner_id, created_at desc);

create index if not exists medical_records_previous_version_idx
  on public.medical_records (owner_id, previous_version_id);

create table if not exists public.medical_record_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id text not null,
  action text not null check (action in ('upload', 'download', 'delete')),
  record_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists medical_record_audit_actor_created_idx
  on public.medical_record_audit_logs (actor_id, created_at desc);

create index if not exists medical_record_audit_record_idx
  on public.medical_record_audit_logs (record_id);
