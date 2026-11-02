-- Task 7: secure medical-document vault extensions.
-- The service role performs storage operations; client roles must not receive
-- the storage service key or direct bucket access.

alter table if exists public.medical_records
  add column if not exists ocr_status text not null default 'not_requested',
  add column if not exists ocr_requested_at timestamptz,
  add column if not exists ocr_reviewed_at timestamptz;

do $$ begin
  alter table public.medical_records drop constraint if exists medical_records_ocr_status_check;
  alter table public.medical_records add constraint medical_records_ocr_status_check check (ocr_status in ('not_requested', 'pending_review', 'reviewed', 'rejected'));
exception when undefined_table then null; end $$;

alter table if exists public.medical_record_audit_logs
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists previous_hash text,
  add column if not exists event_hash text;

do $$ begin
  alter table public.medical_record_audit_logs drop constraint if exists medical_record_audit_logs_action_check;
  alter table public.medical_record_audit_logs add constraint medical_record_audit_logs_action_check check (action in ('upload', 'download', 'delete', 'export', 'share', 'revoke_share', 'ocr_request', 'ocr_review'));
exception when undefined_table then null; end $$;

create unique index if not exists medical_record_audit_event_hash_unique on public.medical_record_audit_logs(event_hash) where event_hash is not null;

create table if not exists public.medical_record_extractions (
  record_id uuid primary key references public.medical_records(id) on delete cascade,
  owner_id text not null,
  extracted_text text not null default '',
  structured_data jsonb not null default '{"fields":[]}'::jsonb,
  confidence numeric(4,3) not null default 0 check (confidence >= 0 and confidence <= 1),
  review_status text not null default 'pending_review' check (review_status in ('pending_review', 'reviewed', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists medical_record_extractions_owner_idx on public.medical_record_extractions(owner_id, review_status);

create table if not exists public.medical_record_share_grants (
  token text primary key,
  record_id uuid not null references public.medical_records(id) on delete cascade,
  owner_id text not null,
  purpose text not null default 'care coordination',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (length(token) >= 32),
  check (expires_at > created_at)
);
create index if not exists medical_record_share_grants_record_idx on public.medical_record_share_grants(record_id, expires_at);

alter table public.medical_record_extractions enable row level security;
alter table public.medical_record_share_grants enable row level security;

drop policy if exists extraction_owner_read on public.medical_record_extractions;
create policy extraction_owner_read on public.medical_record_extractions for select using (owner_id = current_setting('app.user_id', true));
drop policy if exists share_grant_owner_read on public.medical_record_share_grants;
create policy share_grant_owner_read on public.medical_record_share_grants for select using (owner_id = current_setting('app.user_id', true));

-- Audit rows are append-only from the application perspective. Do not grant
-- update/delete to client roles; the service role is used for append operations.
revoke update, delete on public.medical_record_audit_logs from anon, authenticated;
