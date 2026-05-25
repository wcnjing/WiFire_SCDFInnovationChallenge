"""Model wrapper around LightGBM for the reach-within-T classifier."""

from __future__ import annotations

import logging
import pickle
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import lightgbm as lgb
import numpy as np
import pandas as pd

from .config import PROCESSED_DIR

logger = logging.getLogger(__name__)

MODEL_PATH = PROCESSED_DIR / "coverage_classifier.lgb"
PREPROCESSOR_PATH = PROCESSED_DIR / "coverage_preprocessor.pkl"


@dataclass
class CoverageModel:
    """Thin wrapper bundling the LightGBM booster + feature ordering.

    Notebook 4 trains and populates this; the visualization notebook loads it
    via `load()`.
    """

    feature_names: list[str] = field(default_factory=list)
    booster: Optional[lgb.Booster] = None

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        if self.booster is None:
            raise RuntimeError("Model has not been trained or loaded.")
        return self.booster.predict(X[self.feature_names])

    def save(self, model_path: Path = MODEL_PATH,
             preprocessor_path: Path = PREPROCESSOR_PATH) -> None:
        if self.booster is None:
            raise RuntimeError("No booster to save.")
        self.booster.save_model(str(model_path))
        with preprocessor_path.open("wb") as f:
            pickle.dump({"feature_names": self.feature_names}, f)
        logger.info("Saved model to %s", model_path)

    @classmethod
    def load(cls, model_path: Path = MODEL_PATH,
             preprocessor_path: Path = PREPROCESSOR_PATH) -> "CoverageModel":
        booster = lgb.Booster(model_file=str(model_path))
        with preprocessor_path.open("rb") as f:
            meta = pickle.load(f)
        return cls(feature_names=meta["feature_names"], booster=booster)
