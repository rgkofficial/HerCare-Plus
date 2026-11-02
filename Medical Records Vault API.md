# Medical Records Vault API

Task #7 provides an authenticated, owner-scoped lifecycle for prescriptions, lab reports, and medical documents. The Supabase `medical-records` bucket must be private; the browser never receives a service key or a permanent storage URL.

## Security contract

Every route derives `owner_id` from the NextAuth session. User-supplied owner IDs are ignored. File uploads accept only PDF, JPEG, and PNG files up to 10 MB, validate magic bytes, sanitize display names, and perform a baseline EICAR/known-signature quarantine check before storage. Deployments should run a ClamAV-compatible worker and update `scan_status` for defense in depth; records not marked `clean` are excluded from listings and sharing.

Preview and download both use the same owner check and a Supabase signed URL that expires after 60 seconds. A signed URL is a temporary credential and must not be logged or persisted by clients. Storage/database partial failures are returned as explicit errors and uploads are best-effort cleaned up when metadata insertion fails.

## Endpoints

- `GET /api/medical-records` — list up to 100 clean records for the signed-in owner.
- `POST /api/medical-records` — multipart upload with `file` and optional `category` (`prescription`, `lab_report`, `medical_report`, `other`).
- `GET /api/medical-records/download?id=...` — create a 60-second owner-scoped access link.
- `DELETE /api/medical-records/delete` — JSON `{ "id": "..." }`; deletes only the owner’s latest version and preserves version-chain integrity.
- `POST /api/medical-records/versions` and `GET /api/medical-records/versions?id=...` — append and inspect owner-scoped version chains.
- `POST /api/medical-records/share` — JSON `{ recordId, recipientLabel, expiresInHours }`; requires explicit owner consent and returns a hashed-token-backed link credential valid for 1–72 hours.
- `GET /api/medical-records/share?token=...` — validates the hashed token, expiry, revocation, ownership relation, and clean scan status, then returns a 60-second signed URL.
- `GET /api/medical-records/export` — returns an owner-scoped JSON manifest with short-lived links; it never includes storage paths.

## OCR and review

The schema has `ocr_status`, `ocr_text`, `extracted_data`, and `reviewed_at` fields so an asynchronous OCR worker can write a proposed extraction as `needs_review`. The application must not treat OCR output as clinical truth until a human reviewer changes it to `reviewed`. OCR is intentionally separated from upload so an OCR outage cannot block secure document storage.

## Audit and retention

Upload, download, delete, share, and shared-link access events are written to `medical_record_audit_logs`. The hardening migration adds event metadata/hash columns and revokes update/delete for application roles; production should complete the hash-chain trigger using the deployment’s database role. Default retention is seven years and `retention_until` is indexed for a scheduled purge worker. Sharing is revocable by setting `revoked_at`; the bearer token is stored only as a SHA-256 hash.

Apply migrations in order, create the private bucket, configure NextAuth and Supabase secrets, and run `npm test`, `npm run lint`, and `npm run build` before deployment. Known limitation: the repository includes a safe baseline scanner and scanner integration point, not a bundled antivirus daemon or medical-grade OCR model.
