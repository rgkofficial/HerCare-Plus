create table if not exists public.symptom_journal_entries (
  id text not null,
  owner_id text not null,
  entry_date date not null,
  entry jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create index if not exists symptom_journal_owner_date_idx
  on public.symptom_journal_entries(owner_id, entry_date asc);

alter table public.symptom_journal_entries enable row level security;
revoke all on table public.symptom_journal_entries from anon, authenticated;
grant select, insert, update, delete on table public.symptom_journal_entries to service_role;

-- Server routes use the service role only after deriving owner_id from NextAuth.
-- No browser role receives direct table or storage access.
