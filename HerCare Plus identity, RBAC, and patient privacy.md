# HerCare Plus identity, RBAC, and patient privacy

## Security boundary

The application now has two explicit modes. Local mode is a browser-only convenience with no server identity. Account mode uses NextAuth JWT sessions with an eight-hour maximum age and a one-hour update window. Sensitive server routes derive the identity from the server session; browser-provided owner, tenant, actor, and patient identifiers are never trusted for authorization.

Credential accounts use scrypt password hashes with a random per-password salt. Password policy requires at least 12 characters with upper/lowercase, a number, and a symbol. Google OAuth remains supported and provisions a patient identity into a personal tenant on first successful session claim resolution. Patients are the default role; clinicians, specialists, and administrators are explicit roles.

## RBAC and BOLA controls

Permissions are granular rather than role-name checks. Patients receive self-health, consent, privacy, provider-grant/revoke, and self-audit permissions. Clinicians and specialists receive shared-health permissions but cannot manage users or grant access. Administrators receive all declared permissions. `assertOwnerOrAdmin` and tenant checks reject broken object-level authorization before data reads or writes.

The account API supports profile and privacy-preference updates, append-only consent records with withdrawal events, provider grant/revocation, access-history retrieval, and account anonymization. Provider grant requires an active clinician or specialist in the same tenant. Revocation re-checks the stored grant's patient owner before mutation.

## Authentication interfaces

`POST /api/auth/register` accepts `email`, `password`, and `displayName`, creates a private tenant and patient identity, and returns a generic account-created response. `POST /api/auth/recovery` always returns the same 202 response for valid or unknown emails; it stores only a SHA-256 token hash with a 15-minute expiry. The approved email/SMS delivery provider is intentionally an operational deployment boundary and the raw token is never returned to the browser.

`GET /api/account` returns the authenticated profile, privacy preferences, latest consent records, provider access grants, and recent access events. `PATCH /api/account` updates display name/preferences or appends a consent grant/withdrawal. `POST /api/account` accepts `grant` and `revoke` actions. `DELETE /api/account` requires the exact confirmation phrase `DELETE MY ACCOUNT` and anonymizes the identity, invalidates password access, removes preferences, and audits the operation.

## Rate limiting and suspicious logins

`RedisRateLimiter` accepts a distributed store implementing `increment(key, windowSeconds)`. The default is an in-process fail-safe used for development and tests; production should inject a Redis/Upstash implementation at the adapter boundary. Registration is limited to five attempts per hour per source, recovery to three per 15 minutes, and credentials to five attempts per 15 minutes per email. Repeated failed credential attempts are tracked as suspicious and successful authentication resets the failure window.

## Data model and RLS

`20261102_identity_privacy.sql` adds tenants, identity users, preferences, consent records, provider grants, access events, login events, and recovery tokens. Every table has RLS enabled; browser roles receive no table privileges, and only the server service role is granted access. All audit writes carry tenant, actor, subject, action, resource type, and timestamp. IP and user-agent fields are present for deployment-time hashed telemetry, not raw PII storage.

## Limitations and operational requirements

The repository does not include an SMTP/SMS provider, so recovery token delivery must be wired to an approved provider before production use. The default rate limiter is not distributed until a Redis-compatible store is injected. Google OAuth requires valid provider credentials and `NEXTAUTH_SECRET`. Existing health and record APIs already derive their owner from NextAuth sessions; teams should migrate them to `identityServer.getCurrentIdentity` and explicit permissions as each endpoint is hardened. Account anonymization does not automatically delete every clinical record because retention and legal-hold policy must be applied per record type.

Run `npm run test` and `npm run build`. The task security tests cover password hashing, RBAC, BOLA denial, rate limiting, suspicious-login reset, opaque recovery tokens, and unauthenticated account access.
