# Dataset inventory

Task 5 uses the checked-in UCI Maternal Health Risk dataset only for the
pregnancy-vitals research model. The general symptom path is a deterministic
ruleset and does not infer a clinical diagnosis.

See [the dataset card](./maternal-health-risk.md) for provenance, license,
features, observed data-quality warnings, and known population limitations.
The training and evaluation commands validate the CSV with UTF-8 BOM handling,
strict schema, finite numeric values, supported ranges, and semantic blood
pressure checks before producing the versioned artifact and report.

No synthetic data is used to claim performance. The artifact is not clinically
validated and is not approved for diagnosis, emergency exclusion, or automated
care decisions.
