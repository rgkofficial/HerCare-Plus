from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import ks_2samp

from data_quality import FEATURES, TARGET, load_and_validate, validate_frame


def psi(expected: np.ndarray, actual: np.ndarray, bins: int = 10) -> float:
    expected = np.asarray(expected, dtype=float)
    actual = np.asarray(actual, dtype=float)
    if expected.size == 0 or actual.size == 0:
        raise ValueError("PSI requires non-empty expected and actual samples.")
    if not np.isfinite(expected).all() or not np.isfinite(actual).all():
        raise ValueError("PSI inputs must be finite.")
    quantiles = np.quantile(expected, np.linspace(0, 1, bins + 1))
    inner = np.unique(quantiles[1:-1])
    edges = np.concatenate(([-np.inf], inner, [np.inf]))
    expected_counts, _ = np.histogram(expected, bins=edges)
    actual_counts, _ = np.histogram(actual, bins=edges)
    expected_rate = np.maximum(expected_counts / len(expected), 1e-6)
    actual_rate = np.maximum(actual_counts / len(actual), 1e-6)
    return float(np.sum((actual_rate - expected_rate) * np.log(actual_rate / expected_rate)))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build_report(training: pd.DataFrame, sample: pd.DataFrame, training_path: Path, sample_path: Path) -> dict:
    validate_frame(training, require_target=False)
    validate_frame(sample, require_target=False)
    report = {}
    for feature in FEATURES:
        expected = training[feature].to_numpy(dtype=float)
        actual = sample[feature].to_numpy(dtype=float)
        ks_stat, ks_pvalue = ks_2samp(expected, actual)
        feature_psi = psi(expected, actual)
        report[feature] = {
            "psi": feature_psi,
            "ks_statistic": float(ks_stat),
            "ks_pvalue": float(ks_pvalue),
            "alert": bool(feature_psi >= 0.2 or ks_pvalue < 0.01),
        }
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "training_sha256": sha256(training_path),
        "sample_sha256": sha256(sample_path),
        "training_rows": len(training),
        "sample_rows": len(sample),
        "features": report,
        "alert_thresholds": {"psi": 0.2, "ks_pvalue": 0.01},
        "note": "Monitoring statistics indicate distribution change; they do not establish clinical harm.",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare a new sample to training distributions.")
    parser.add_argument("--training", default="ml/data/maternal-health-risk.csv")
    parser.add_argument("--sample", required=True)
    parser.add_argument("--output")
    args = parser.parse_args()
    training_path, sample_path = Path(args.training), Path(args.sample)
    training_raw = pd.read_csv(training_path, encoding="utf-8-sig")
    training = (
        load_and_validate(training_path)
        if TARGET in training_raw.columns
        else validate_frame(training_raw, require_target=False)
    )
    sample = validate_frame(
        pd.read_csv(sample_path, encoding="utf-8-sig"), require_target=False
    )
    output = build_report(training[FEATURES], sample, training_path, sample_path)
    if args.output:
        Path(args.output).write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
