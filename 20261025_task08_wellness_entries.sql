CREATE TABLE IF NOT EXISTS public.wellness_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_id TEXT NOT NULL,

    category TEXT NOT NULL CHECK (
        category IN (
            'hydration',
            'nutrition',
            'activity',
            'sleep',
            'mood'
        )
    ),

    date DATE NOT NULL,

    value NUMERIC NOT NULL CHECK (value >= 0),

    unit TEXT NOT NULL,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wellness_entries_owner_date_idx
ON public.wellness_entries (owner_id, date DESC);

ALTER TABLE public.wellness_entries
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.wellness_entries
FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.wellness_entries
TO service_role;