# Personalized Wellness & Lifestyle Intelligence API

The wellness dashboard is authenticated and owner-scoped. Every route derives `owner_id` from the NextAuth session; no client-provided owner identifier is accepted. The Supabase service-role key remains server-only, and the wellness tables deny direct `anon` and `authenticated` access.

## `GET /api/wellness`

Returns the current user's dashboard data: up to 365 wellness entries, active goals, active habits, recent habit completions, the 90 most recent mood/stress journal entries, and notification/cycle-integration preferences. A database failure returns `502`; an unauthenticated request returns `401`.

## `POST /api/wellness`

All writes use an `action` discriminator:

- `entry`: `{ action, category, date, value, unit, notes? }` for hydration, nutrition, activity, sleep, and mood. Values, units, dates, and note length are validated.
- `journal`: `{ action, date, mood, stress, notes? }`, with mood and stress constrained to 1–5.
- `goal`: `{ action, category, target, unit }`, upserted per owner/category.
- `habit`: `{ action, title, description?, frequency }`, with daily or weekly frequency.
- `completion`: `{ action, habitId, date, completed }`. The API first verifies that the habit belongs to the current user, preventing cross-account completion writes.
- `preferences`: `{ action, notificationsEnabled, cycleIntegrationConsent, reminderTime? }`.

Invalid input returns `400`, missing authentication returns `401`, missing owner-owned habits return `404`, and persistence failures return `502`.

## Personalization and consent

Recommendation rules use user-selected goals and recorded wellness values. Cycle data is read locally only when `cycleIntegrationConsent` is true; the dashboard then uses the count of local cycle entries to offer a non-clinical reflection suggestion. Withdrawing consent immediately stops that context from being read. Cycle entries are never uploaded by this integration. The UI labels recommendations as general wellness information and does not present diagnosis, treatment, or clinical risk claims.

## Accessibility and reminders

Forms use associated labels, keyboard-accessible controls, `aria-pressed` habit toggles, progressbar semantics, live status messaging, and high-contrast text. Reminder enablement, reminder time, and cycle-data consent are user-controlled. This repository stores preferences but does not claim that browser or mobile push delivery is configured; a notification worker/provider must be connected before reminders are considered delivered.

## Data model and privacy

Apply `supabase/migrations/202611010008_wellness_lifestyle_intelligence.sql` after the existing wellness entries migration. It creates goals, habits, habit completions, journals, and preferences with owner indexes, uniqueness constraints, validation checks, RLS enabled, and direct client grants revoked.

Wellness information is sensitive personal data. Configure retention/deletion policy and audit access in production. Do not add analytics identifiers or export journal notes to logs.

## Verification

Run `npm test`, `npm run lint`, and `npm run build`. Tests cover numeric/date validation, journal scale validation, reminder validation, unknown-action rejection, and invalid habit completion input. The existing route security contract continues to require authentication and owner scoping.
