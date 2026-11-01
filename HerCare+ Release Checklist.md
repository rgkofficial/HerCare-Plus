# HerCare+ Release Checklist

## Code and automated quality

- [ ] Branch is up to date and working tree is clean.
- [ ] Code review completed for UI, APIs, data access, tests, and documentation.
- [ ] `npm ci --no-audit --no-fund` succeeds.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:ci`, `npm run verify:release`, and `npm run build` succeed.
- [ ] No secrets, patient data, generated artifacts, or `.env` files are committed.

## Security and privacy

- [ ] Medical-record routes have authentication and owner-scoped queries.
- [ ] Negative authorization tests pass for list, download, delete, OCR, and version history.
- [ ] Storage bucket is private; signed URLs are short-lived.
- [ ] Production secrets are in the provider secret manager.
- [ ] Logs contain request IDs but no medical content or credentials.
- [ ] HTTPS and security headers verified in the deployed response.

## Product QA

- [ ] Patient: consent, symptom checker, emergency guidance, cycle tracker, care finder, wellness, export/delete.
- [ ] Provider/admin: sign-in and protected medical-record flows reviewed against the agreed contract.
- [ ] Responsive checks completed at mobile, tablet, and desktop breakpoints.
- [ ] Keyboard navigation, focus visibility, labels, contrast, and reduced-motion behavior checked.
- [ ] Supported browser smoke tests completed: current Chrome, Firefox, Safari, and mobile Safari/Chrome.

## Operations and evidence

- [ ] Migration applied to staging and production with version recorded.
- [ ] Backup timestamp recorded; latest restoration drill evidence attached.
- [ ] `GET /api/health` returns 200 after deployment.
- [ ] Rollback commit and owner are known.
- [ ] Known limitations and unresolved defects are documented.
- [ ] Attach CI URL, deployment URL, screenshots, API contract, and test summary to the release ticket.
