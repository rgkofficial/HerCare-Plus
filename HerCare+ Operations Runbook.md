# HerCare+ Operations Runbook

This runbook is the operating contract for the production release. It deliberately separates checks that can run in CI from checks that require access to the deployment provider or Supabase project.

## Release gates

Run the following from a clean checkout:

```bash
npm ci --no-audit --no-fund
npm run lint
npm run typecheck
npm run test:ci
npm run verify:release
npm run build
```

The CI workflow runs the same gates on pushes and pull requests. A release is not ready when any gate is red, when a required production secret is absent, or when a database migration has not been applied and verified in the target environment.

## Deploy and smoke test

1. Merge only after CI passes and review confirms the medical-record authorization tests remain green.
2. Deploy the exact commit SHA to the hosting provider; do not deploy an uncommitted working tree.
3. Configure secrets from the provider secret manager, never from a committed `.env` file. Run `npm run check-env:production` in the deployment environment.
4. Check `GET /api/health`. Expect HTTP 200 and `status: "ok"`; HTTP 503 means the application must not receive traffic.
5. Smoke test home, consent, checker fallback, care finder, cycle tracker, sign-in, medical-record upload/download/delete, and `/api/health`.
6. Confirm browser console is clean, HTTPS is active, the PWA manifest loads, and the response includes `X-Request-ID` and security headers.

## Monitoring and alerts

The application emits JSON logs with `timestamp`, `level`, `event`, and `requestId`. Sensitive fields are redacted. Configure the platform log sink to alert on:

- any `level=error` health check;
- five or more 5xx responses in five minutes;
- sustained `/api/gemini` latency above the provider SLO;
- authentication failures or storage errors above the normal baseline;
- repeated `medical_record` authorization failures.

Do not send medical record contents, symptom text, OCR output, tokens, cookies, or API keys to logs or third-party analytics.

## Rollback

1. Stop the rollout and record the failing commit, time, request IDs, and impact.
2. Re-deploy the last known-good immutable commit using the hosting provider's rollback control.
3. Re-run `/api/health` and the smoke tests before reopening traffic.
4. If a migration caused the incident, follow the migration's documented down/forward-fix plan. Never delete medical data as an ad-hoc rollback.
5. Preserve sanitized logs and open an incident review within one business day.
