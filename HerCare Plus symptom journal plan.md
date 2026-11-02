# HerCare Plus symptom journal plan

## Design

Three candidate directions: **Soft clinical glass** (0.06), **Editorial menstrual almanac** (0.08), and **Warm signal dashboard** (0.06). Choose **Warm signal dashboard**: a calm rose/plum surface with compact signal cards, clear uncertainty badges, and a journal-first flow.

Core principles: make every prediction explainable; keep daily logging low-friction; distinguish tracking from diagnosis; and make trends useful for a clinician conversation without exposing data to a server by default.

Color philosophy: rose marks active cycle signals, plum marks pattern exploration, amber marks uncertainty, and slate carries neutral safety copy. Layout uses a split journal/trend rhythm rather than a dense centered grid. Signature elements are pill-shaped confidence badges, a biphasic timeline strip, and a quiet “bring this to your clinician” summary card. Motion is limited to subtle entry transitions; no animated health signals. Typography follows the existing Nunito/Tailwind voice, with bold compact headings and readable body copy.

Brand essence: a private, non-judgmental companion for noticing reproductive-health patterns. Personality: reassuring, transparent, practical. Voice examples: “Notice the pattern, not a diagnosis.” and “A missing day is still useful context.”

## Implementation

- Extend the cycle domain into `src/lib/symptomJournal.ts` with validated daily logs, cycle detection, timezone-safe date arithmetic, prediction intervals, fertility uncertainty, symptom-frequency correlation, clinician-summary generation, CSV serialization, and print-safe report data.
- Replace the current minimal cycle persistence with a versioned IndexedDB store that keeps entries locally by default and supports flow, cervical fluid, basal temperature, mood, pain, PCOS/hormonal tags, notes, and journal metadata.
- Update `/cycle` to provide an interactive month calendar, one-tap daily logging, symptom/pain journal fields, configurable cycle settings, trend cards, donut/bar/biphasic visualizations, uncertainty disclaimers, and CSV/PDF export. PDF uses the browser print flow so sensitive data never leaves the device.
- Add a Supabase migration and optional authenticated API for users who opt into account sync; enforce owner-derived identity and RLS. The local-first UI remains usable if the API is unavailable.
- Add route metadata, documentation, and edge-case tests for irregular cycles, missing days, leap years, and timezone-safe date arithmetic.

## Project structure

- `src/lib/symptomJournal.ts`: domain types, validation, analytics, prediction, export helpers.
- `src/lib/storage.ts`: local IndexedDB persistence and schema migration.
- `src/app/cycle/page.tsx`: journal UI, calendar, trend visualization, and exports.
- `src/app/api/symptom-journal/route.ts`: authenticated opt-in sync API.
- `supabase/migrations/20261102_symptom_journal.sql`: private sync schema and RLS.
- `tests/task-symptom-journal.test.ts`: deterministic domain and privacy coverage.
- `docs/SYMPTOM_JOURNAL.md`: interfaces, safety boundaries, and known limitations.
