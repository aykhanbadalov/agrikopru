import joblib
import numpy as np
import shap

from config import (
    BASE_TL_PER_HA,
    MODEL_PATH,
    MODEL_VERSION,
    RISK_BAND_LOW,
    RISK_BAND_MEDIUM,
    SCORE_MAX,
    SCORE_MIN,
    SYNTHETIC_NOTE,
)
from api.schemas import ScoreRequest, ScoreResponse

FEATURES = [
    "land_size_ha",
    "farming_history_years",
    "cooperative_member",
    "tarsim_history_score",
    "fertilizer_purchases",
    "climate_risk_score",
]

_model = None
_explainer = None


def load_model():
    global _model, _explainer
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model tapılmadı: {MODEL_PATH}. "
            "Əvvəlcə `python training/train.py` işlət."
        )
    _model = joblib.load(MODEL_PATH)
    _explainer = shap.TreeExplainer(_model)


def get_model():
    if _model is None:
        raise RuntimeError("Model yüklənməyib.")
    return _model


def _risk_band(score: int) -> str:
    if score >= RISK_BAND_LOW:
        return "LOW"
    if score >= RISK_BAND_MEDIUM:
        return "MEDIUM"
    return "HIGH"


def score_request(req: ScoreRequest) -> ScoreResponse:
    model = get_model()

    feature_values = [
        req.land_size_ha,
        req.farming_history_years,
        int(req.cooperative_member),
        req.tarsim_history_score,
        req.fertilizer_purchases,
        req.climate_risk_score,
    ]
    X = np.array([feature_values], dtype=float)

    repayment_prob = float(model.predict_proba(X)[0, 1])
    score = int(round(repayment_prob * SCORE_MAX))
    score = max(SCORE_MIN, min(SCORE_MAX, score))

    credit_limit_tl = None
    if req.region_profitability_index is not None:
        credit_limit_tl = round(
            (score / SCORE_MAX) * req.land_size_ha * req.region_profitability_index * BASE_TL_PER_HA,
            2,
        )

    raw = _explainer.shap_values(X)
    # Binary classifier: list qaytarırsa → [class0, class1]; array → birbaşa
    if isinstance(raw, list):
        shap_vals = raw[1][0]   # class 1 ("repaid"), birinci nümunə
    else:
        shap_vals = raw[0]
    total_abs = sum(abs(v) for v in shap_vals) or 1.0
    feature_contributions = {
        name: round(float(v / total_abs), 4)
        for name, v in zip(FEATURES, shap_vals)
    }

    return ScoreResponse(
        score=score,
        repayment_probability=round(repayment_prob, 4),
        risk_band=_risk_band(score),
        credit_limit_tl=credit_limit_tl,
        model_version=MODEL_VERSION,
        data_note=SYNTHETIC_NOTE,
        feature_contributions=feature_contributions,
    )
