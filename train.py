from __future__ import annotations

import argparse
import hashlib
import json
import platform
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from data_quality import FEATURES, LABELS, load_and_validate


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def package_versions() -> dict[str, str]:
    import pandas
    import sklearn
    import scipy
    return {
        "numpy": np.__version__,
        "pandas": pandas.__version__,
        "scikit_learn": sklearn.__version__,
        "scipy": scipy.__version__,
    }


def commit_hash() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"], text=True
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        return "unavailable"


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the maternal risk model.")
    parser.add_argument("--config", default="ml/config.json")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    config = json.loads((root / args.config).read_text())
    seed = int(config["seed"])
    np.random.seed(seed)
    data_path = root / config["data"]
    output_path = root / config["artifact"]
    data = load_and_validate(data_path)
    x_train, x_test, y_train, y_test = train_test_split(
        data[FEATURES], data["RiskLevel"], test_size=config["test_size"],
        random_state=seed, stratify=data["RiskLevel"],
    )
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(
            max_iter=2000, random_state=seed
        )),
    ])
    cv = StratifiedKFold(n_splits=config["cv_folds"], shuffle=True, random_state=seed)
    cv_scores = cross_val_score(pipeline, x_train, y_train, cv=cv, scoring="balanced_accuracy")
    pipeline.fit(x_train, y_train)
    classifier = pipeline.named_steps["classifier"]
    scaler = pipeline.named_steps["scaler"]
    artifact = {
        "version": "maternal-risk-v1",
        "features": FEATURES,
        "classes": list(classifier.classes_),
        "coefficients": classifier.coef_.tolist(),
        "intercepts": classifier.intercept_.tolist(),
        "mean": scaler.mean_.tolist(),
        "scale": scaler.scale_.tolist(),
        "training_mean": x_train.mean().tolist(),
        "training_std": x_train.std(ddof=0).replace(0, 1).tolist(),
        "training_min": x_train.min().tolist(),
        "training_max": x_train.max().tolist(),
        "training_covariance": np.cov(x_train.to_numpy(), rowvar=False).tolist(),
        "data_sha256": sha256(data_path),
        "seed": seed,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "git_commit": commit_hash(),
        "python": platform.python_version(),
        "packages": package_versions(),
        "config_sha256": sha256(root / args.config),
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(artifact, indent=2) + "\n")
    print(json.dumps({
        "rows": len(data), "train_rows": len(x_train), "test_rows": len(x_test),
        "class_balance": data["RiskLevel"].value_counts().to_dict(),
        "duplicate_rows": int(data.duplicated().sum()),
        "cv_balanced_accuracy_mean": float(cv_scores.mean()),
        "cv_balanced_accuracy_std": float(cv_scores.std()),
        "test_accuracy": float(accuracy_score(y_test, pipeline.predict(x_test))),
        "artifact": str(output_path),
    }, indent=2))


if __name__ == "__main__":
    main()
