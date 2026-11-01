# Medical Records Vault API

The vault stores sensitive documents in the private `medical-records` Supabase bucket. Every owner-scoped route derives the owner from the NextAuth session; client-supplied owner IDs are never trusted. The Supabase service-role key is server-only.

## Security contract

Uploads accept PDF, JPEG, and PNG only, have a 10 MiB limit, and must match their file signature. Filenames are sanitized and UUID storage paths are generated server-side. A pre-storage quarantine gate rejects the EICAR antivirus test string and executable signatures. This gate is intentionally conservative and is not a substitute for a production AV provider; deployments should keep an asynchronous provider in front of any document that is not `scan_status=clean`.

Signed storage URLs expire after 60 seconds. Preview uses the same short-lived URL as download. The UI must not cache, log, or persist signed URLs.

## Endpoints

- `GET /api/medical-records` lists at most 100 records owned by the current user.
- `POST /api/medical-records` accepts multipart `file` and optional `category` (`prescription`, `lab_report`, `medical_report`, `other`).
- `GET /api/medical-records/download?id=...` checks ownership before issuing a 60-second URL.
- `DELETE /api/medical-records/delete` accepts JSON `{ "id": "..." }`, checks ownership, removes storage, then removes metadata. A database failure after storage removal is returned explicitly.
- `GET /api/medical-records/versions?id=...` returns an owner-scoped version chain.
- `POST /api/medical-records/versions` uploads a version only from the latest owner-scoped version.
- `GET /api/medical-records/export` returns an owner-scoped metadata manifest with 60-second URLs. It does not expose storage paths.
- `POST /api/medical-records/share` accepts `{ recordId, recipientLabel?, expiresInHours? }`. The maximum consent duration is 72 hours. The raw token is returned once; only its SHA-256 hash is stored.
- `DELETE /api/medical-records/share` accepts `{ id }` and revokes an active share for the owner.
- `GET /api/medical-records/shared/{token}` validates expiry/revocation and issues a 60-second read-only URL. It exposes metadata only after the document is scan-cleared.
- `POST /api/medical-records/ocr-review` accepts `{ recordId, ocrText }`, stores reviewed extraction text for the owner, and marks `review_required=false`.
- `POST /api/medical-records/retention` is scheduler-only and requires the `x-retention-job-secret` header matching `RETENTION_JOB_SECRET`. It removes expired storage objects first, tombstones metadata with `deleted_at`, and reports candidates that need reconciliation.

## Lifecycle and privacy

New records receive a seven-year `retention_until` default and `ocr_status=pending_review`. Extraction is not considered trusted until the owner submits the review endpoint. The schema includes `deleted_at` for soft-delete/retention workers; a deployment job should remove expired storage objects and then metadata, recording `retention_delete` audit events.

Audit events cover upload, download, delete, share creation/revocation, export, retention deletion, and OCR review. Do not describe the audit table as cryptographically immutable: production must deny UPDATE/DELETE through database policies and restrict inserts to the service role. The migration expands the action constraint but does not create the storage bucket, AV provider, OCR provider, or production RLS policies automatically.

## Verification

Run `npm test`, `npm run lint`, and `npm run build`. Tests cover unauthenticated access, cross-account download denial, MIME/signature/size validation, storage cleanup after metadata failure, quarantine signatures, and safe filename handling.
