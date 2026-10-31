import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml"))

from data_quality import FEATURES, load_and_validate, validate_frame  # noqa: E402
from evaluate import _ece  # noqa: E402
from monitor import psi  # noqa: E402


class MlQualityTests(unittest.TestCase):
    def test_dataset_quality_and_schema(self):
        data = load_and_validate(ROOT / "ml/data/maternal-health-risk.csv")
        self.assertEqual(data.shape, (1014, 7))
        self.assertEqual(set(data["RiskLevel"]), {"low risk", "mid risk", "high risk"})

    def test_ece_hand_case(self):
        actual = np.array([0, 1, 1, 0])
        predicted = np.array([0.1, 0.9, 0.8, 0.2])
        self.assertAlmostEqual(_ece(actual, predicted), 0.15)

    def test_identical_distributions_have_zero_psi(self):
        values = np.arange(20, dtype=float)
        self.assertEqual(psi(values, values), 0.0)

    def test_unknown_target_and_nonfinite_values_are_rejected(self):
        data = load_and_validate(ROOT / "ml/data/maternal-health-risk.csv")
        invalid_target = data.copy()
        invalid_target.loc[0, "RiskLevel"] = "unknown"
        with self.assertRaises(ValueError):
            validate_frame(invalid_target)
        invalid_value = data.copy()
        invalid_value.loc[0, "Age"] = np.nan
        with self.assertRaises(ValueError):
            validate_frame(invalid_value)

    def test_monitor_schema_rejects_inverted_blood_pressure(self):
        row = pd.DataFrame([[28, 80, 120, 7, 98, 75]], columns=FEATURES)
        with self.assertRaises(ValueError):
            validate_frame(row, require_target=False)


if __name__ == "__main__":
    unittest.main()
