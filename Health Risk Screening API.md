# Health Risk Screening API

`POST /api/health-risk` accepts JSON only and requires an authenticated
NextAuth session. The endpoint does not persist screening results, but the
request is processed by the application server; platform access logs and
privacy-reviewed aggregate operational telemetry may exist. Do not send names,
contact details, free text, or identifiers in this payload.

The general symptom contract is:

```json
{
  "age": 28,
  "symptomDurationDays": 2,
  "painSeverity": 2,
  "heavyBleeding": false,
  "faintingOrSevereDizziness": false,
  "pregnancyPossible": false
}
```

If `pregnancyPossible` is `true`, all six `maternalVitals` are required:
`age` (years), `systolicBP`/`diastolicBP` (mmHg), `bloodSugar` (mmol/L),
`bodyTemperature` (°F), and `heartRate` (bpm). Vitals are rejected when the
pregnancy flag is false. Unknown fields, missing fields, non-finite values,
invalid ranges, and `systolicBP <= diastolicBP` return `400`.

Unauthenticated requests return `401`; a non-JSON content type returns `415`;
oversized requests return `413`. Successful responses include a version,
risk band, factors, `escalationRequired`, `confidence`, `abstained`, an
`abstentionReason`, next steps, and the limitation that this is a screening
risk indicator, not a diagnosis. `higher indicator` or worsening symptoms
require urgent clinical attention; call local emergency services for an
emergency.

The pregnancy-vitals artifact is `maternal-risk-v1`. It is a retrospective
logistic-regression research artifact trained on a rural-Bangladesh dataset;
its raw score is not calibrated clinical probability. The serving adapter
validates artifact dimensions and finite values, checks training-range and
Mahalanobis out-of-distribution status, returns no model probability when OOD,
and abstains on low top-class scores. Deterministic urgent red flags always
remain `higher indicator` and cannot be downgraded by the model.

Server telemetry contains only model/ruleset version, latency, OOD flag,
confidence, and aggregate counters; it must never contain health inputs or
user identifiers. The PSI/KS script is an offline monitoring report and does
not establish clinical harm or model safety. Clinical use would require
prospective, representative, clinician-reviewed external validation,
calibration, subgroup safety analysis, governance approval, and a prespecified
release protocol.
