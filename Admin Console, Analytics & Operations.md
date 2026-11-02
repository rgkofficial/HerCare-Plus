# Admin Console, Analytics & Operations

Task #9 adds a deny-by-default operational control plane at `/admin` and `/api/admin/*`. The console is designed to operate without exposing personal health information: dashboard metrics are aggregate operational counts, support rows use redacted descriptions, and exports omit user health payloads.

## Authorization

Administrative access is explicit, not inferred from a Google account or email domain. Configure `ADMIN_MEMBERS` as a server-only comma-separated allowlist, for example:

```text
ADMIN_MEMBERS=google-sub-1:super_admin,google-sub-2:analyst
```

Roles are ranked `analyst < support_agent < operations_admin < super_admin`. Every route obtains the user ID from the NextAuth session, checks the allowlist, and returns `403` before querying Supabase for unauthorized callers. Production deployments should manage the same assignments in `admin_members` through a controlled provisioning process; the environment allowlist remains the bootstrap gate.

## Endpoints

- `GET /api/admin/overview` — service-health summary, notification counts, open ticket queue, feature flags, and recent operational events.
- `GET /api/admin/members` — operations-admin roster; `PATCH` is super-admin-only for role/active changes.
- `GET /api/admin/providers` — provider directory without patient data; `PATCH` is operations-admin-only for active and appointment availability settings.
- `GET /api/admin/flags` — flag list; `PATCH` is operations-admin-only and validates key names and rollout 0–100.
- `GET /api/admin/tickets?status=...` — support-agent queue with minimized fields; `PATCH` updates status/priority and records an audit event.
- `GET /api/admin/notifications` — delivery status; `POST` requeues only failed deliveries for retry.
- `GET /api/admin/export?report=operations|notifications|tickets` — permission-checked CSV with no clinical payloads and `Cache-Control: no-store`.

All state-changing endpoints append to `admin_audit_logs`. Audit metadata is operational and intentionally excludes message bodies, document contents, recipient addresses, and clinical data. Notification delivery stores recipient hashes rather than addresses.

## Operational model

`operational_events` supports request, background-job, error, and health-check telemetry. A worker can write delivery attempts to `notification_deliveries`; retries are bounded by the worker and dead-lettered after its configured threshold. `feature_flags` supports percentage rollout and explicit enablement. `support_tickets` stores redacted descriptions and queue metadata only.

Apply `supabase/migrations/202611010009_admin_console_operations.sql` using the service role. Keep all admin tables inaccessible to `anon` and `authenticated`; browser access must remain through the audited API routes. Add rate limiting and external alerting at the deployment edge before production use. This repository includes the control-plane contract and safe defaults, but it does not include a mail/SMS provider or a persistent job runner.
