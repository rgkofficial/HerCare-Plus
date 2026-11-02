# Women's Health Symptom & Pain Journal

## Product boundary

HerCare Plus now provides a local-first reproductive-health journal for noticing personal patterns. It is a tracking and clinician-conversation aid, not a diagnostic, contraceptive, fertility-treatment, or prescribing system. Fertility and period dates are estimates with uncertainty badges; the UI repeats that ovulation can vary with irregular cycles, PCOS, postpartum changes, illness, and hormonal medication.

## Journal model

Each date can record flow (`none`, `spotting`, `light`, `medium`, `heavy`), cervical fluid, optional basal temperature, pain severity from 0–10, pain areas, symptoms, mood, PCOS/hormonal tags, and a private note. The domain validator rejects impossible dates, invalid ranges, malformed tags, and notes over 1,000 characters.

The date arithmetic is UTC date-only arithmetic. This prevents a user in Honolulu, Kolkata, Auckland, or another timezone from crossing a date boundary because a JavaScript `Date` was parsed at local midnight. Leap years and missing days are explicitly represented in analytics rather than silently filled.

## Predictions and analytics

Period starts are detected when flow appears after more than three days without flow. Valid cycle lengths are limited to 15–60 days for averages, while irregular or sparse histories widen the estimate range and lower confidence. The fertility window is an educational estimate around a predicted ovulation date. Trend cards include flow distribution, symptom frequency and average pain, mood distribution, missing-day context, and a biphasic phase strip.

The clinician summary is a concise, generated description of logged dates, cycle regularity, common symptoms, and PCOS/hormonal tags. It explicitly says it is not a diagnosis. CSV export contains journal fields. PDF export uses the browser print flow with sensitive values kept on the device.

## Privacy and sync

Journal entries are stored in IndexedDB by default. The optional `GET/POST /api/symptom-journal` route requires a NextAuth session and derives `owner_id` from that session; it never accepts an owner identifier from the browser. The migration grants table access only to the Supabase service role and includes owner/date indexes. The UI remains functional without sync or network access.

## Verification

Run `npm run test` and `npm run build`. The task tests cover leap days, missing days, irregular cycles, international timezone boundaries, low-confidence predictions, safety disclaimers, symptom correlation, CSV quoting, invalid input, and unauthenticated sync access.

## Known limitations

The journal does not infer ovulation from temperature or fluid because that would overstate certainty; these fields are recorded for the user and clinician. The current local-first implementation does not automatically sync across devices. Optional sync requires deploying the Supabase migration and a correctly configured NextAuth/Supabase service role. The browser print export is not a cryptographically signed medical record.
