from pathlib import Path

BASE_DIR = Path(__file__).parent

# Real tətbiqdə bank tərəfdaşı ilə kalibrasiya ediləcək; V1 üçün Türkiyə
# kənd təsərrüfatı kredit normalarına yaxın placeholder dəyər
BASE_TL_PER_HA: float = 75000.0

SCORE_MIN: int = 0
SCORE_MAX: int = 1000
REPAYMENT_THRESHOLD: float = 0.50

# score >= LOW_THRESHOLD → LOW risk, >= MEDIUM_THRESHOLD → MEDIUM, else HIGH
RISK_BAND_LOW: int = 700
RISK_BAND_MEDIUM: int = 400

MODEL_PATH: Path = BASE_DIR / "training" / "model.joblib"
METRICS_PATH: Path = BASE_DIR / "training" / "metrics.json"
DATASET_PATH: Path = BASE_DIR / "data" / "synthetic_dataset.csv"

OCR_CONFIDENCE_THRESHOLD: float = 0.6
OCR_LANG: str = "tur"
OCR_MAX_FILE_MB: int = 10

SYNTHETIC_NOTE: str = (
    "Scores based on synthetic training data — not real historical repayment records"
)
MODEL_VERSION: str = "SYNTHETIC_MODEL_V1"
