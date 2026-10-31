# Maternal Health Risk dataset card

- **Source:** UCI Machine Learning Repository, dataset 863
- **Official URL:** https://archive.ics.uci.edu/dataset/863/maternal+health+risk
- **Citation:** Ahmed, M. (2020). *Maternal Health Risk*.
  https://doi.org/10.24432/C5DP5D
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0).
  The license permits sharing and adaptation with attribution.
- **Downloaded file:** `ml/data/maternal-health-risk.csv`
- **SHA-256:** `a1f7025719f84715096e0d1f95ae2e56b57809b9b15449e1836c96a7d976ae9b`
- **Rows/features:** The downloaded CSV contains 1,014 data rows and 6
  features (plus target); the UCI metadata page reports 1,013 instances. This
  one-row provenance discrepancy is retained and disclosed.
- **Collection context:** Data was collected from hospitals, community
  clinics, and maternal health care facilities in rural Bangladesh through an
  IoT-based risk monitoring system.

## Features and target

`Age` (years), `SystolicBP` and `DiastolicBP` (mmHg), `BS` (mmol/L),
`BodyTemp` (F), and `HeartRate` (bpm) predict the categorical `RiskLevel`
(`low risk`, `mid risk`, `high risk`). The UCI page reports no missing values.

Observed class counts are 406 low, 336 mid, and 272 high risk. The quality
check found 562 duplicate rows, 39 rows with age below 13, and 2 rows with
heart rate below 30 bpm. Duplicates are retained for transparent reproduction,
but make random holdout metrics optimistic if repeated records represent the
same underlying observations.

## Biases and limitations

This is a convenience dataset from one geographic setting and an IoT
monitoring context. The collection process, label definitions, clinical
workflow, demographic coverage, and missingness mechanisms may not represent
HerCare+ users or other populations. It is pregnancy-specific, does not
represent general women's health, and has no evidence here of clinical
validation. Metrics in this repository are retrospective research estimates
only and must not be used for diagnosis or care decisions.
