from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from sklearn.calibration import calibration_curve
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from data_quality import FEATURES, LABELS, load_and_validate


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _package_versions() -> dict[str, str]:
    import pandas
    import sklearn
    import scipy
    return {
        "numpy": np.__version__,
        "pandas": pandas.__version__,
        "scikit_learn": sklearn.__version__,
        "scipy": scipy.__version__,
    }


def bootstrap_interval(
    actual: np.ndarray, predicted: np.ndarray, seed: int, metric
) -> list[float]:
    rng = np.random.default_rng(seed)
    samples = []
    for _ in range(1000):
        indices = rng.integers(0, len(actual), len(actual))
        samples.append(metric(actual[indices], predicted[indices]))
    return [float(np.percentile(samples, 2.5)), float(np.percentile(samples, 97.5))]


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate the maternal risk model.")
    parser.add_argument("--config", default="ml/config.json")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    config = json.loads((root / args.config).read_text())
    seed = int(config["seed"])
    data = load_and_validate(root / config["data"])
    x_train, x_test, y_train, y_test = train_test_split(
        data[FEATURES], data["RiskLevel"], test_size=config["test_size"],
        random_state=seed, stratify=data["RiskLevel"],
    )
    model = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(max_iter=2000, random_state=seed)),
    ])
    model.fit(x_train, y_train)
    raw_probabilities = model.predict_proba(x_test)
    probabilities = raw_probabilities[
        :, [list(model.classes_).index(label) for label in LABELS]
    ]
    predictions = model.predict(x_test)
    truth = np.column_stack([(y_test.to_numpy() == label).astype(int) for label in LABELS])
    metrics: dict[str, object] = {
        "version": "maternal-risk-v1",
        "test_rows": len(y_test),
        "labels": LABELS,
        "confusion_matrix": confusion_matrix(y_test, predictions, labels=LABELS).tolist(),
        "roc_auc_ovr": float(roc_auc_score(truth, probabilities, multi_class="ovr")),
        "pr_auc_macro": float(average_precision_score(truth, probabilities, average="macro")),
        "brier_macro": float(np.mean([
            brier_score_loss(truth[:, i], probabilities[:, i]) for i in range(len(LABELS))
        ])),
        "ece_macro_10_bins": float(np.mean([
            _ece(truth[:, i], probabilities[:, i]) for i in range(len(LABELS))
        ])),
        "per_class": {},
        "subgroups": {},
        "calibration": {},
        "data_sha256": _sha256(root / config["data"]),
        "artifact_sha256": _sha256(root / config["artifact"]),
        "config_sha256": _sha256(root / args.config),
        "packages": _package_versions(),
        "seed": seed,
        "note": "Metrics are retrospective holdout estimates, not clinical validation.",
    }
    for index, label in enumerate(LABELS):
        actual = truth[:, index]
        predicted = (predictions == label).astype(int)
        tn, fp, fn, tp = confusion_matrix(actual, predicted, labels=[0, 1]).ravel()
        metrics["per_class"][label] = {
            "n_positive": int(actual.sum()),
            "sensitivity": float(recall_score(actual, predicted, zero_division=0)),
            "specificity": float(tn / (tn + fp)) if tn + fp else None,
            "ppv": float(precision_score(actual, predicted, zero_division=0)),
            "npv": float(tn / (tn + fn)) if tn + fn else None,
            "sensitivity_ci95": bootstrap_interval(
                actual,
                predicted,
                seed,
                lambda a, p: recall_score(a, p, zero_division=0),
            ),
        }
        fraction_pos, mean_pred = calibration_curve(actual, probabilities[:, index], n_bins=10, strategy="uniform")
        metrics["calibration"][label] = {
            "observed": fraction_pos.tolist(), "predicted": mean_pred.tolist(),
            "brier": float(brier_score_loss(actual, probabilities[:, index])),
            "ece": float(_ece(actual, probabilities[:, index])),
        }
    for name, mask in {
        "age_10_19": data.loc[x_test.index, "Age"] < 20,
        "age_20_34": data.loc[x_test.index, "Age"].between(20, 34),
        "age_35_plus": data.loc[x_test.index, "Age"] >= 35,
    }.items():
        count = int(mask.sum())
        metrics["subgroups"][name] = {
            "n": count,
            "balanced_accuracy": float(_balanced_accuracy(y_test[mask], predictions[mask]))
            if count else None,
            "caveat": "Small sample; interpret cautiously." if count < 30 else None,
        }
    output = root / config["evaluation"]
    output.write_text(json.dumps(metrics, indent=2) + "\n")
    print(json.dumps(metrics, indent=2))


def _ece(actual: np.ndarray, predicted: np.ndarray, bins: int = 10) -> float:
    edges = np.linspace(0, 1, bins + 1)
    total = 0.0
    for lower, upper in zip(edges[:-1], edges[1:]):
        mask = (predicted >= lower) & (predicted <= upper if upper == 1 else predicted < upper)
        if mask.any():
            total += mask.mean() * abs(actual[mask].mean() - predicted[mask].mean())
    return float(total)


def _balanced_accuracy(actual, predicted) -> float:
    scores = []
    for label in LABELS:
        binary_actual = actual == label
        binary_predicted = predicted == label
        tn, fp, fn, tp = confusion_matrix(binary_actual, binary_predicted, labels=[False, True]).ravel()
        scores.append((tp / (tp + fn) if tp + fn else 0) + (tn / (tn + fp) if tn + fp else 0))
    return float(np.mean(scores) / 2)


if __name__ == "__main__":
    main()
