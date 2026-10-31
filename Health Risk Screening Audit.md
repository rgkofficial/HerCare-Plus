# Health Risk Screening Audit

## Current release decision

Task 5 delivers a reproducible, authenticated screening-indicator service. It
is not a clinically validated decision-support system and must not be used for
diagnosis, treatment selection, emergency exclusion, or automated decisions.
The pregnancy-vitals path uses the checked-in `maternal-risk-v1` research
artifact; the general symptom path uses `ruleset-2026-10-26` deterministic
rules. Both paths expose limitations and abstention states.

## Controls implemented

- Strict JSON/content-size/session checks and rejection of unknown or malformed
  fields, non-finite numbers, unsupported ranges, missing pregnancy context,
  and inverted blood pressure.
- Versioned artifact serving with feature-order, dimension, finite-value, and
  positive-scale integrity checks; cached covariance inverse; range and
  Mahalanobis OOD abstention.
- Monotonic safety precedence: fainting/severe dizziness and pain >= 9 remain a
  higher indicator even when the maternal model predicts a lower class.
- Reproducible dataset validation, seeded stratified split, five-fold CV,
  sensitivity/specificity, PPV/NPV, bootstrap intervals, calibration
  diagnostics, age subgroups, provenance hashes, and offline PSI/KS monitoring.
- Privacy-safe telemetry that records aggregate operational metadata only; no
  raw screening inputs or user identifiers.

## Evidence boundary

The evaluation is retrospective and contains 562 duplicate rows. The source is
pregnancy-specific and collected in rural Bangladesh; it does not establish
performance for HerCare+ users. Raw model scores are not calibrated clinical
probabilities. Mid-risk sensitivity is low in the checked-in holdout and must
not be hidden by a single aggregate metric. Prospective external validation,
clinician review, calibration, subgroup safety analysis, data governance, and
release approval are required before any clinical claim.

## Clinician review protocol

Use the plan in `CLINICIAN_REVIEW_PROTOCOL.md` before considering expansion:
lock the version, obtain ethics/data-governance approval, prespecify inclusion
criteria and safety thresholds, separate development/locked/prospective sets,
review adverse outcomes, and publish failures as well as successes.
