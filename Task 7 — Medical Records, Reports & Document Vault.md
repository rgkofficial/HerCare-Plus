# Task 7 — Medical Records, Reports & Document Vault

## Delivered scope

The existing authenticated medical-records vault now covers upload, private storage, safe preview/download through 60-second signed links, categorization, search/filtering, version history, version upload, deletion, metadata export, retention review, and consent-based one-hour share links. The UI adds OCR request/review controls, retention visibility, export, and sharing actions.

Supported files remain PDF, JPEG, and PNG up to 10 MB. The server validates the declared type and file signature before storage, sanitizes filenames, and runs a deterministic EICAR test-signature quarantine check. The EICAR path is intentionally safe to test; production deployments must connect a malware-scanning provider and keep quarantined files outside the user-accessible bucket.

## APIs

- `GET/POST /api/medical-records` lists or uploads owner-scoped documents.
- `GET /api/medical-records/download?id=...` creates a 60-second signed link after an owner check.
- `POST /api/medical-records/versions` adds a new owner-scoped version and rejects branching histories.
- `GET /api/medical-records/versions?id=...` returns the owner-scoped version chain.
- `DELETE /api/medical-records/delete` removes a leaf version and its private file.
- `POST /api/medical-records/ocr` requests extraction or records a human review/rejection.
- `GET /api/medical-records/ocr?id=...` returns only the owner’s extraction state.
- `GET /api/medical-records/export` returns metadata plus 60-second links and records export events.
- `POST/GET/DELETE /api/medical-records/share` creates, accesses, or revokes a consent-based expiring share grant.
- `POST /api/medical-records/retention` performs a dry-run by default or deletes owner documents past `retention_until` when explicitly requested.

## Privacy and authorization

Every owner-facing endpoint derives identity from the authenticated NextAuth session and never accepts a client-supplied owner ID. Share access is the only deliberate unauthenticated path, and it requires a high-entropy token that is scoped to one record, expires within 24 hours, and can be revoked by the owner. Audit logs record upload, download, delete, export, share, revoke, OCR request, and OCR review actions without recording document contents. Event hashes chain each record’s audit events and client roles have no update/delete permission on the audit table.

## OCR and human review

Extraction is deliberately conservative. It stores text with confidence `0` and `pending_review`; no structured medical field is trusted until the owner marks the result reviewed. The current implementation supplies a safe provider seam and PDF text candidate, not clinical-grade OCR. Image OCR and structured field extraction require a reviewed external document-processing service before production use.

## Retention and operations

Uploads receive a seven-year default retention deadline. The retention endpoint supports dry-run inspection and explicit owner-scoped cleanup. Production should invoke it from a protected scheduled worker, add legal-hold support, and ensure deletion jobs process version leaves safely. Storage and metadata deletion remain separate operations and failures are returned rather than silently ignored.

## Verification

```bash
npm run test
npm run build
```

The Task 7 tests cover MIME/signature spoofing, EICAR quarantine, retention calculations, pending OCR review, and audit-hash chaining. Existing medical-record API tests continue to cover unauthenticated access, cross-account download denial, unsupported types, oversized files, signature mismatches, storage failures, cleanup, and valid upload behavior.

## Known limitations

The malware scanner is a deterministic EICAR test hook, not an antivirus engine. OCR is a conservative extraction seam and needs a reviewed provider. Export links are intentionally short-lived JSON metadata links rather than a long-lived ZIP. The existing Supabase service-role adapter must be deployed with RLS migration `20261101_task07_medical_vault.sql`; direct browser access to the private bucket is not supported.
