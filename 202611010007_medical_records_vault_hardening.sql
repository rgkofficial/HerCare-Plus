-- Task #7 hardening: apply after 202610260001_medical_records.sql.
-- Keep the bucket private and run this migration with the Supabase SQL editor.

alter table public.medical_records
  add column if not exists scan_status text not null default 'clean'
    check (scan_status in ('quarantined', 'clean', 'rejected')),
  add column if not exists ocr_status text not null default 'pending_review'
    check (ocr_status in ('not_started', 'pending_review', 'reviewed', 'failed')),
  add column if not exists ocr_text text,
  add column if not exists review_required boolean not null default true,
  add column if not exists deleted_at timestamptz;

create table if not exists public.medical_record_shares (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.medical_records(id) on delete cascade,
  owner_id text not null,
  token_hash text not null unique,
  recipient_label text not null default 'Care provider',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);
create index if not exists medical_record_shares_record_idx
  on public.medical_record_shares(record_id, owner_id);
create index if not exists medical_record_shares_active_idx
  on public.medical_record_shares(token_hash, expires_at)
  where revoked_at is null;

-- Prevent application code from rewriting historical audit rows. The service role
-- may insert, while updates/deletes should be denied by RLS/policy in deployment.
alter table public.medical_record_audit_logs
  drop constraint if exists medical_record_audit_action_check;
alter table public.medical_record_audit_logs
  add constraint medical_record_audit_action_check check (
    action in ('upload', 'download', 'delete', 'share_created', 'share_revoked', 'export', 'retention_delete', 'ocr_review')
  );

comment on table public.medical_record_shares is 'Consent-based, expiring access grants. Store only a SHA-256 token hash.';
comment on column public.medical_records.ocr_text is 'Structured extraction output; never expose until human review is complete.';
