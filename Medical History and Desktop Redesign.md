# Medical History and Desktop Redesign

## Delivered

`/medical-records` is now a desktop-first medical history workspace with responsive behavior for mobile and tablet widths. It provides overview counts, a structured personal profile, medication management, the existing secure document vault, a chronological timeline, and user-initiated JSON export.

The global shell uses a responsive sidebar at desktop widths and retains the compact bottom navigation on mobile. The shared canvas spans desktop viewports instead of being capped at 480px.

## API

`GET /api/medical-history` requires a NextAuth session. The route derives `owner_id` from `session.user.id` and does not accept a client owner identifier. It returns the owner’s profile, medications, visits, document metadata, and a merged timeline.

`GET /api/medical-history?type=export` returns structured profile, medication, visit, and document metadata for the authenticated owner. It does not include file contents or signed URLs. The export action is audit logged.

`POST /api/medical-history` supports:

- `action: profile`: blood group, allergies, chronic conditions, surgeries, family history, emergency contact, cycle history, and gynecological history.
- `action: medication`: name, dosage, frequency, start/end dates, prescribing clinician, and current/completed/discontinued status.
- `action: visit`: visit date, clinician, specialty, reason, and notes.

`DELETE /api/medical-history` accepts only `type: medication` or `type: visit` and an item ID. Every delete is constrained by the authenticated owner.

Existing `/api/medical-records` routes remain responsible for PDF/JPEG/PNG validation, private Supabase Storage, short-lived signed download URLs, preview/download, version history, and document deletion. The new dashboard calls those routes rather than duplicating storage logic.

## Database

Apply `supabase/migrations/202611020009_medical_history.sql` after the existing medical-record migration. It creates `medical_profiles`, `medical_medications`, and `medical_visits`, with owner indexes, field length/date/status checks, update timestamps, RLS enabled, and direct browser grants revoked. The migration also extends the existing audit action check to include export.

## Security boundaries

All structured-history reads and writes require authentication and owner predicates. Export contains metadata only. Private document content remains behind the existing owner-scoped signed URL endpoint. No medical note or file content is written to application logs.

## Known limitations

The repository still has no malware scanner, OCR provider, or asynchronous human-review workflow. The existing upload route validates MIME declarations, file signatures, size, and private storage, but production malware scanning must be connected before unrestricted document uploads are claimed safe. The current document dashboard shows preview/download through signed URLs and retains the established version-history API, while the structured dashboard’s compact vault view does not yet expose every version-management control inline.

Run `npm test`, `npm run lint`, and `npm run build` after applying the migration in the target Supabase project.
