# HerCare+ Disaster Recovery and Backup Drill

## Recovery objectives

- **RTO target:** 4 hours for application traffic after an infrastructure failure.
- **RPO target:** determined by the configured Supabase backup plan; this repository cannot claim a backup RPO until the project owner verifies the provider plan.
- **Privacy constraint:** medical records are sensitive health data. Backups, exports, and temporary restore environments must use the same access controls as production.

## Before every release

1. Confirm the Supabase project has automated backups enabled and retention documented in the provider console.
2. Record the latest backup timestamp and migration version in the release ticket.
3. Export the ordered migration list with `find supabase/migrations -type f -name '*.sql' | sort`.
4. Apply migrations to a disposable staging project first. Verify tables, indexes, storage bucket privacy, and RLS policies.
5. Run the medical-record negative-authorization tests against staging or an approved test double. Never use real patient data for testing.

## Quarterly restoration drill

1. Create an isolated restore project with no public access.
2. Restore the selected backup and apply migrations only after confirming the restored schema version.
3. Run row-count and index checks; verify that medical storage remains private and signed URLs expire as configured.
4. Run the application smoke suite and confirm that a user cannot read another user's record, including versions and downloads.
5. Measure restore duration and document the result, gaps, and owner. Destroy the temporary project and all downloaded artifacts after sign-off.

## Incident recovery

- **Application failure:** roll back to the last known-good commit, then validate `/api/health`.
- **Database failure:** stop writes where possible, open provider recovery support, restore to an isolated project, validate migrations and authorization, then switch connection settings through the secret manager.
- **Credential exposure:** rotate the exposed secret immediately, invalidate sessions where applicable, inspect audit logs, and document affected systems. Do not print the secret in the incident ticket.
- **Data deletion or corruption:** do not improvise SQL repairs. Preserve evidence, restore a copy, compare records with an approved owner, and obtain explicit data-governance approval before any production correction.

This runbook is a procedure, not proof that a backup or restore has succeeded. Each drill must attach its timestamped evidence to the release record.
