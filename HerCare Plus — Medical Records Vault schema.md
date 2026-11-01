# HerCare Plus — Medical Records Vault schema

The migration `supabase/migrations/202610260001_medical_records.sql` creates the core tables. The hardening migration `supabase/migrations/202611010007_medical_records_vault_hardening.sql` adds lifecycle state and consent sharing.

## `medical_records`

Stores metadata only; file bytes live in private Supabase Storage. Important columns are `owner_id`, sanitized `file_name`, opaque unique `storage_path`, category, MIME type, size, version chain (`version_number` and `previous_version_id`), `retention_until`, `scan_status`, `ocr_status`, `ocr_text`, `review_required`, `deleted_at`, and timestamps.

## `medical_record_shares`

Stores a consent grant tied to both `record_id` and `owner_id`. Only a SHA-256 hash of the random bearer token is persisted. `expires_at` and `revoked_at` make the grant short-lived and revocable. The raw token is returned once by the share API.

## `medical_record_audit_logs`

Stores actor, action, record, and timestamp. Actions include upload, download, delete, share creation/revocation, export, retention deletion, and OCR review. The application never logs document contents, OCR text, signed URLs, or raw share tokens.

## Required deployment controls

Keep the storage bucket private. Apply RLS/policies that prevent end users from reading or mutating these tables directly; service-role access must remain server-side. Deny UPDATE and DELETE on the audit table after validating existing policies. Configure an antivirus provider for asynchronous scanning and an OCR provider only if the extracted result remains `pending_review` until a person confirms it. Run a scheduled retention worker using the `retention_until` index, remove storage objects before metadata, and record failures for reconciliation.

The migration is intentionally additive and does not create a bucket or overwrite an existing production schema without review.
