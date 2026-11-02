# HerCare Plus identity, RBAC, and privacy plan

## Design decision

Three directions were considered: **Quiet security ledger** (0.07), **Clinical access console** (0.08), and **Human-centered privacy garden** (0.06). Choose **Quiet security ledger**: a calm privacy dashboard with a visible access ledger, explicit consent controls, and deliberate destructive actions.

Core principles are deny-by-default authorization, owner-derived identity, data minimization, and explainable privacy controls. Rose remains the product signal color; slate and emerald carry trust and successful controls; amber and red appear only for warnings or irreversible actions. The layout uses a vertical privacy ledger rather than a dashboard grid: identity, consent, sessions, grants, and deletion are separate reviewable sections. Signature elements are permission chips, timestamped access events, and a two-step deletion/anonymization confirmation. Interaction is explicit and reversible where possible; deletion is gated and audited. Animation is limited to small section transitions. Typography keeps the existing Nunito voice with compact uppercase labels and high-contrast body text.

Brand essence: a privacy-first care identity layer for patients and the professionals they choose. Personality: clear, protective, respectful. Voice examples: “You decide who can see your care data.” and “Access ends when consent ends.”

## Implementation approach

- Add `src/lib/identity.ts` with roles, permissions, server-side session identity resolution, password hashing/verification, account validation, Redis-compatible rate limiting with an in-memory safe fallback, suspicious-login detection, and permission checks.
- Extend NextAuth with secure credential login alongside the existing Google provider. Credential registration stores only scrypt password hashes. Recovery requests return a generic response and store only hashed, expiring recovery tokens; delivery is an operational integration boundary.
- Add `/api/auth/register`, `/api/auth/recovery`, and `/api/account` for registration, recovery request, profile/preferences/consent management, access history, grants, revocation, and deletion/anonymization. Every route derives `owner_id` from the authenticated session and uses fail-closed authorization.
- Add a Supabase migration for tenants, identity users, consent records, privacy preferences, access grants, access audit events, login events, recovery tokens, and anonymization state with RLS and service-role-only server access.
- Replace the privacy page with a working identity/privacy console. Keep local mode explicit and separate from authenticated account identity; never claim local mode is a server-authenticated session.
- Add tests for role permissions, BOLA resistance, rate limiting, password/recovery helpers, consent withdrawal, and unauthenticated/negative access boundaries.

## Project structure

- `src/lib/identity.ts`: identity types, permissions, secure hashing, rate limits, suspicious login detection, and authorization helpers.
- `src/lib/authOptions.ts`: NextAuth provider configuration and role/session claims.
- `src/app/api/auth/register/route.ts`: tenant/account registration.
- `src/app/api/auth/recovery/route.ts`: generic recovery request and token rotation.
- `src/app/api/account/route.ts`: authenticated profile, privacy, consent, access history, grants, and deletion operations.
- `src/app/privacy/page.tsx`: identity and privacy control center.
- `supabase/migrations/20261102_identity_privacy.sql`: private identity and audit schema.
- `tests/task-auth-privacy.test.ts`: deterministic security and negative authorization coverage.
- `docs/AUTH_PRIVACY.md`: interfaces, threat model, operational boundaries, and limitations.
