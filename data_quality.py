from __future__ import annotations

from pathlib import Path
from typing import Final

import numpy as np
import pandas as pd

FEATURES: Final = ["Age", "SystolicBP", "DiastolicBP", "BS", "BodyTemp", "HeartRate"]
TARGET: Final = "RiskLevel"
LABELS: Final = ["low risk", "mid risk", "high risk"]
RANGES: Final = {
    "Age": (1, 120), "SystolicBP": (60, 220), "DiastolicBP": (30, 140),
    "BS": (0, 40), "BodyTemp": (90, 110), "HeartRate": (1, 220),
}


def validate_frame(data: pd.DataFrame, require_target: bool = True) -> pd.DataFrame:
    expected = FEATURES + ([TARGET] if require_target else [])
    if list(data.columns) != expected:
        raise ValueError(f"Expected columns {expected}, found {list(data.columns)}")
    if data.empty:
        raise ValueError("Dataset is empty.")
    for column in FEATURES:
        if not pd.api.types.is_numeric_dtype(data[column]):
            raise ValueError(f"{column} must be numeric.")
        values = data[column].to_numpy(dtype=float)
        if not np.isfinite(values).all():
            raise ValueError(f"{column} contains non-finite values.")
        lower, upper = RANGES[column]
        if not data[column].between(lower, upper).all():
            raise ValueError(f"{column} contains values outside {lower}..{upper}.")
    if (data["SystolicBP"] <= data["DiastolicBP"]).any():
        raise ValueError("SystolicBP must exceed DiastolicBP.")
    if require_target:
        if data[TARGET].isna().any() or not data[TARGET].isin(LABELS).all():
            raise ValueError("Dataset contains a missing or unknown target label.")
    return data


def load_and_validate(path: Path) -> pd.DataFrame:
    data = pd.read_csv(path, encoding="utf-8-sig")
    validated = validate_frame(data)
    duplicate_count = int(validated.duplicated().sum())
    if duplicate_count:
        print(f"QUALITY WARNING: duplicate rows={duplicate_count}")
    if (validated["Age"] < 13).any():
        print(f"QUALITY WARNING: age_below_13_rows={(validated['Age'] < 13).sum()}")
    if (validated["HeartRate"] < 30).any():
        print(f"QUALITY WARNING: heart_rate_below_30_rows={(validated['HeartRate'] < 30).sum()}")
    return validated
