# Reproductive tracking engine

Task #3 adds a privacy-aware reproductive tracking domain layer around the existing offline cycle screen.

## What is included

- Calendar-day-safe period and symptom validation (`YYYY-MM-DD`), including leap-year and invalid-date checks.
- Backfillable period logging from the cycle screen.
- Rolling cycle-start analysis with valid-cycle filtering, variability, irregular-pattern flags, and missing-data disclosure.
- Fertility-window estimates with an explicit uncertainty range and a non-contraceptive/non-diagnostic disclaimer.
- Symptom and mood payloads suitable for PCOS discussion journaling, plus pregnancy context fields in the authenticated API contract.
- JSON export and a clinician discussion summary that preserve the original data for review.
- Owner-scoped API routes and a service-role-only Supabase table. Every API operation derives `owner_id` from the authenticated NextAuth session; it never accepts an owner id from the request body.

## API

`/api/reproductive-tracking` requires an authenticated session.

- `GET` returns the current user's entries.
- `GET ?mode=summary` returns a clinician discussion summary.
- `GET ?mode=export` returns a downloadable JSON export.
- `POST` accepts a validated entry (`id`, `entryType`, `date`, optional flow/symptom/mood/pain/notes/pregnancy fields).
- `DELETE ?id=<entry-id>` deletes only an entry belonging to the current user.

Run the migration `supabase/migrations/202611020003_reproductive_tracking.sql` before enabling the persisted API path.

## Clinical and product limitations

The engine is an educational tracking aid, not a diagnostic device, fertility treatment, contraception, or pregnancy-care tool. Calendar predictions are inherently uncertain, especially with PCOS, postpartum changes, perimenopause, illness, medication changes, or sparse/missing data. A clinician should review pain, bleeding, pregnancy concerns, or persistent cycle changes. The pregnancy field is limited to journaling context and does not provide pregnancy diagnosis or clinical monitoring.

## Verification

```bash
npm test -- --run tests/reproductiveTracking.test.ts
npm run lint
npm run build
```
