-- Task #7 hardening: quarantine, OCR review, consent sharing, exports and tamper evidence.
alter table public.medical_records
  add column if not exists scan_status text not null default 'clean'
    check (scan_status in ('pending', 'clean', 'infected', 'failed')),
  add column if not exists scan_provider text,
  add column if not exists ocr_status text not null default 'not_requested'
    check (ocr_status in ('not_requested', 'pending', 'needs_review', 'reviewed', 'failed')),
  add column if not exists ocr_text text,
  add column if not exists extracted_data jsonb,
  add column if not exists reviewed_at timestamptz,
  add column if not exists deleted_at timestamptz;

create index if not exists medical_records_scan_status_idx on public.medical_records (scan_status);
create index if not exists medical_records_retention_idx on public.medical_records (retention_until);

alter table public.medical_record_audit_logs
  add column if not exists event_hash text,
  add column if not exists previous_event_hash text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.medical_record_shares (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.medical_records(id) on delete cascade,
  owner_id text not null,
  recipient_label text not null check (char_length(recipient_label) between 1 and 120),
  token_hash text not null unique,
  expires_at timestamptz not null,
  consented_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists medical_record_shares_owner_idx on public.medical_record_shares (owner_id, created_at desc);
create index if not exists medical_record_shares_expiry_idx on public.medical_record_shares (expires_at);

create table if not exists public.medical_record_exports (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  manifest jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Make the audit table append-only for the application role. The service role
-- may still write events, but no application caller can update/delete history.
revoke update, delete on public.medical_record_audit_logs from authenticated, anon;
revoke update, delete on public.medical_record_audit_logs from public;

-- Extend the action vocabulary used by consent-based sharing.
alter table public.medical_record_audit_logs drop constraint if exists medical_record_audit_logs_action_check;
alter table public.medical_record_audit_logs add constraint medical_record_audit_logs_action_check check (action in ('upload', 'download', 'delete', 'share', 'share_access'));
