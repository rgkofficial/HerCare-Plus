# Medical History and Desktop Redesign

The `/medical-records` page is now a desktop-first Medical History workspace. It includes owner-scoped profile, medications, visits, timeline, and private document vault sections. The mobile layout remains touch-friendly and uses the existing compact navigation.

## Structured API

`/api/medical-history` derives `owner_id` only from the authenticated NextAuth session.

- `GET` returns `profile`, `medication`, and `visit` data for the authenticated owner, or a single resource when `?resource=...` is supplied.
- `POST` accepts `resource: profile|medication|visit` and validates the corresponding payload.
- `PATCH` requires the resource and record ID and applies both owner filters.
- `DELETE` requires the resource and record ID and applies both owner filters.
- `/api/medical-history/export` returns structured history and document metadata only. It deliberately excludes storage paths, signed URLs, service credentials, and quarantined files.

Profile fields are optional. Medications never infer or prescribe dosages. Entries default to `user_reported`; users may explicitly mark clinician-confirmed information. Visits use user-provided dates and no fabricated sample records are created.

## Documents

Existing document and version endpoints remain the storage compatibility layer. Supported files are PDF, JPEG, and PNG, capped at 10 MB, stored under private owner-scoped paths, and accessed through 60-second signed URLs after an owner check. The list route excludes quarantined rows. New category values include imaging, discharge summaries, consultation notes, women’s health reports, and vaccination records.

The upload path verifies magic bytes and rejects the EICAR antivirus test signature before storage. This is a deterministic quarantine guard, not a full malware scanner. Production deployment still needs an isolated antivirus/quarantine provider (for example, an object-storage event worker with ClamAV or a managed scanning service) before files can be described as malware-scanned. OCR is intentionally not enabled: medical files are not sent to AI services, and no extracted field is persisted without a future consented, human-reviewed workflow.

## Database and retention

Apply `supabase/migrations/202611020010_medical_history.sql` after the existing medical-record migration. It creates `medical_profiles`, `medical_medications`, and `medical_visits`, expands document categories, adds scan state, and indexes owner/category/timeline fields. All structured tables are service-role-only with RLS enabled; API queries always scope to the server-derived owner.

The current document schema stores a seven-year `retention_until` timestamp. An actual scheduled purge worker is still required to enforce expiry; the timestamp alone is not an enforcement workflow. Deletion and storage cleanup remain separate operations and should be reconciled by a background job in production if a storage/database partial failure occurs.

## Desktop layout

The global shell no longer caps the app at 480px. The navbar uses the available desktop viewport, while the bottom touch navigation is hidden at desktop breakpoints and retained on mobile. The Medical History link is available from the navbar drawer.
