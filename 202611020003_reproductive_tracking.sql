-- Task #3: privacy-aware reproductive tracking storage.
-- The API uses the service role only after deriving owner_id from NextAuth.
CREATE TABLE IF NOT EXISTS public.reproductive_entries (
    id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('period', 'symptom', 'mood', 'pcos', 'pregnancy')),
    date DATE NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, owner_id)
);
CREATE INDEX IF NOT EXISTS reproductive_entries_owner_date_idx
ON public.reproductive_entries (owner_id, date DESC);
ALTER TABLE public.reproductive_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.reproductive_entries FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reproductive_entries TO service_role;

COMMENT ON TABLE public.reproductive_entries IS 'Encrypted-at-rest reproductive entries; access is owner-scoped by the authenticated API service.';
COMMENT ON COLUMN public.reproductive_entries.payload IS 'Validated symptom, mood, pain, notes, and pregnancy context. Never expose this table without owner authorization.';
