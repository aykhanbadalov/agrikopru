"""
XGBoost təlim skripti — sintetik dataset üzərində.

QEYD: AUC-un yüksək çıxması gözləniləndir, çünki etiket birbaşa rule_score-dan
törəyir; model əslində həmin qaydanı öyrənir. Real default tarixçəsi üzərində
bu rəqəm tamamilə fərqli ola bilər.
"""

import json
import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import (
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import DATASET_PATH, METRICS_PATH, MODEL_PATH, MODEL_VERSION, SYNTHETIC_NOTE
from data.generate_dataset import generate

FEATURES = [
    "land_size_ha",
    "farming_history_years",
    "cooperative_member",
    "tarsim_history_score",
    "fertilizer_purchases",
    "climate_risk_score",
]
TARGET = "repaid"
RANDOM_STATE = 42
TEST_SIZE = 0.20


def load_or_generate() -> tuple:
    if DATASET_PATH.exists():
        import pandas as pd
        df = pd.read_csv(DATASET_PATH)
        print(f"Mövcud dataset oxundu: {len(df)} nümunə")
    else:
        print("Dataset tapılmadı, yaradılır...")
        df = generate()
    return df[FEATURES].values, df[TARGET].values


def main() -> None:
    X, y = load_or_generate()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, stratify=y, random_state=RANDOM_STATE
    )

    model = XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=1,
        eval_metric="auc",
        early_stopping_rounds=20,  # XGBoost 2.x-də konstruktorda verilir
        random_state=RANDOM_STATE,
    )
    # use_label_encoder XGBoost 2.x-də silinib — əlavə etmə

    model.fit(
        X_train,
        y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    y_prob = model.predict_proba(X_test)[:, 1]
    y_pred = (y_prob >= 0.50).astype(int)

    metrics = {
        "model_version": MODEL_VERSION,
        "data_note": SYNTHETIC_NOTE,
        "test_size": TEST_SIZE,
        "n_test": len(y_test),
        "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 4),
        "precision": round(float(precision_score(y_test, y_pred)), 4),
        "recall": round(float(recall_score(y_test, y_pred)), 4),
        "f1": round(float(f1_score(y_test, y_pred)), 4),
        "best_iteration": int(model.best_iteration),
    }

    print("\n--- Metriklər ---")
    for k, v in metrics.items():
        print(f"  {k}: {v}")

    print("\n--- Feature Importance ---")
    for name, score in zip(FEATURES, model.feature_importances_):
        print(f"  {name}: {score:.4f}")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2, ensure_ascii=False))

    print(f"\nModel saxlanıldı: {MODEL_PATH}")
    print(f"Metriklər saxlanıldı: {METRICS_PATH}")


if __name__ == "__main__":
    main()
