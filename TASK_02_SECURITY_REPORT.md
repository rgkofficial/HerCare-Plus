# HerCare Plus Task #2 — Authentication, Identity & Privacy Management

## Implemented controls

The `feat/task-02-auth-privacy-management` branch adds a server-owned identity boundary for the existing Google/NextAuth flow. First-time Google sign-in provisions a `user_profiles` row with the least-privileged `patient` role. Roles are constrained to `patient`, `healthcare_professional`, and `administrator`; clients cannot submit or override a role.

NextAuth sessions now use signed JWTs with an eight-hour maximum lifetime and one-hour refresh interval. Sign-in and sign-out events are recorded in `privacy_access_logs`. Sensitive API prefixes are protected by Next.js middleware and every sensitive handler also performs server-side session and active-profile checks, so middleware is not the only authorization boundary.

The privacy API at `/api/privacy` supports authenticated privacy-dashboard reads, explicit consent updates and withdrawal, access-history reads, JSON export, and account deletion. Account deletion removes medical-record storage objects, medical-record metadata, wellness entries, and the application profile, while retaining a minimal audit trail. Medical-record operations continue to enforce owner matching server-side.

The migration `supabase/migrations/202610310001_task02_identity_privacy.sql` creates profiles, consent preferences, and privacy audit tables with RLS enabled and no direct anon/authenticated grants. The service-role client is used only from server modules.

## Required deployment configuration

Set `NEXTAUTH_URL`, a strong random `NEXTAUTH_SECRET`, Google OAuth client credentials, `SUPABASE_URL`, and the server-only `SUPABASE_SECRET_KEY`. Apply all Supabase migrations before enabling Google sign-in. Configure Google OAuth redirect URI as `${NEXTAUTH_URL}/api/auth/callback/google`.

## Verification

`npm test -- --run` passes with 34 tests. `npm run lint` passes. `npm run build` completes successfully and includes the new `/api/privacy` route and middleware.

## Known limitations and operational requirements

The product currently uses Google as its only identity provider; registration and recovery are therefore delegated to Google, and there is no password-reset flow in HerCare itself. The rate limiter is intentionally a best-effort per-instance limiter and must be replaced or supplemented with a shared edge/Redis limiter for multi-instance production deployment. Professional and administrator roles must be assigned through a controlled server-side process or reviewed migration; self-service elevation is not permitted. A healthcare production launch still requires provider access review, key rotation, incident response, retention policy approval, and an independent security assessment.
