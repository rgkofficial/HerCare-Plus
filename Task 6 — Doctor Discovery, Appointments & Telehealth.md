# Task 6 — Doctor Discovery, Appointments & Telehealth

## Delivered scope

The `/appointments` workspace adds searchable provider profiles, city/specialty/telehealth/language filters, provider detail cards, timezone-labelled availability, video or clinic appointment mode, consent capture, appointment confirmation, cancellation, patient/provider views, and a video waiting-room link for confirmed telehealth appointments. The existing `/care` directory now links directly to the appointment workspace.

The API is `GET/POST /api/care`. Discovery is public product data. Slots are generated from provider availability in `Asia/Kolkata` and returned in ISO timestamps with the provider timezone. Appointment actions are `hold`, `confirm`, `cancel`, `reschedule`, and provider-only `complete`. The service rejects missing consent, empty reasons, unknown providers, stale slots, and active double-booking. Status transitions prevent changes after cancellation or completion.

## Access control and privacy

Every appointment API request requires an explicit `x-hercare-user-id` and `x-hercare-role` context in this demo adapter. A patient can create or change only their own appointment. A provider can view or complete only appointments assigned to that provider. Cross-account changes are rejected with 403 responses. The consent checkbox records that the appointment reason may be shared with the selected provider. The UI warns users not to place direct identifiers in appointment notes.

The production-ready database contract is in `supabase/migrations/20261031_task06_care_delivery.sql`. It defines provider profiles, availability slots, appointments, a partial unique index that prevents active double-booking, status and content constraints, and RLS policies keyed to verified `app.user_id` and `app.user_role` settings.

## Telehealth and follow-up boundary

The current waiting-room link is an integration seam, not a claim that a video vendor is configured. A confirmed video appointment receives a stable waiting-room URL shape. A production deployment must replace this with a provider-generated, expiring meeting token and must add consent, recording policy, identity verification, connection state, and vendor security review. Completed appointments are intentionally exposed to the provider view as the handoff point for follow-up and referral workflows.

## Validation

`tests/task06-care-delivery.test.ts` covers future slot generation, timezone metadata, mandatory consent, active-slot collision prevention, patient/provider authorization, cross-account cancellation rejection, confirmation, and provider completion. Run:

```bash
npm run test
npm run build
```

## Known limitations

The local API store is process memory so the feature works without a configured Supabase project; restarting the server clears demo appointments. Rescheduling is implemented in the API/service contract and should be exposed as a UI action once production persistence is enabled. Reminders and notifications are represented by the appointment status contract but require a notification provider and scheduled worker. The demo identity headers must be replaced by a verified session adapter before production use.
