-- Task #9: operational control plane. No table below stores clinical payloads.
create extension if not exists pgcrypto;

create table if not exists public.admin_members (
  user_id text primary key,
  email text,
  role text not null check (role in ('super_admin', 'operations_admin', 'support_agent', 'analyst')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  key text primary key check (key ~ '^[a-z][a-z0-9_\\-]{1,63}$'),
  description text not null default '',
  enabled boolean not null default false,
  rollout_percent integer not null default 0 check (rollout_percent between 0 and 100),
  updated_by text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  channel text not null check (channel in ('email', 'sms', 'push', 'in_app')),
  subject text not null default '',
  body text not null,
  enabled boolean not null default true,
  updated_by text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  recipient_hash text not null,
  channel text not null check (channel in ('email', 'sms', 'push', 'in_app')),
  status text not null check (status in ('queued', 'sent', 'failed', 'dead_letter')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error_code text,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notification_delivery_status_idx on public.notification_deliveries(status, next_retry_at);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  requester_hash text not null,
  category text not null check (category in ('access', 'technical', 'appointment', 'privacy', 'other')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  subject text not null check (char_length(subject) between 1 and 160),
  description_redacted text not null default '',
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_queue_idx on public.support_tickets(status, priority, updated_at desc);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id text not null,
  actor_role text not null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on public.admin_audit_logs(created_at desc);

create table if not exists public.operational_events (
  id uuid primary key default gen_random_uuid(),
  service text not null,
  event_type text not null check (event_type in ('request', 'job', 'error', 'health_check')),
  status text not null check (status in ('ok', 'warning', 'error', 'running')),
  duration_ms integer,
  error_code text,
  occurred_at timestamptz not null default now()
);
create index if not exists operational_events_time_idx on public.operational_events(occurred_at desc);

-- These tables are server-managed only. Browser clients must use audited APIs.
revoke all on admin_members, feature_flags, notification_templates, notification_deliveries,
  support_tickets, admin_audit_logs, operational_events from anon, authenticated;
grant select, insert, update on admin_members, feature_flags, notification_templates,
  notification_deliveries, support_tickets, admin_audit_logs, operational_events to service_role;
revoke update, delete on admin_audit_logs from public;

create table if not exists public.provider_directory (
  provider_id text primary key,
  display_name text not null check (char_length(display_name) between 1 and 120),
  specialty text not null default 'women_health',
  active boolean not null default true,
  appointment_enabled boolean not null default true,
  updated_by text not null,
  updated_at timestamptz not null default now()
);
revoke all on provider_directory from anon, authenticated;
grant select, insert, update on provider_directory to service_role;
