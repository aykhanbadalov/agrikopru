"""
XGBoost təlim skripti — sintetik dataset üzərində.

QEYD: AUC-un yüksək çıxması gözləniləndir, çünki etiket birbaşa rule_score-dan
törəyir; model əslində həmin qaydanı öyrənir. Real default tarixçəsi üzərində
bu rəqəm tamamilə fərqli ola bilər.
"""
'''
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
'''
"""
XGBoost təlim skripti — sintetik dataset üzərində.

QEYD: AUC-un yüksək çıxması gözləniləndir, çünki etiket birbaşa rule_score-dan
törəyir; model əslində həmin qaydanı öyrənir. Real default tarixçəsi üzərində
bu rəqəm tamamilə fərqli ola bilər.

Bu versiyada:
  - Early stopping üçün AYRICA validation dəsti istifadə olunur (test dəsti
    təlimə qarışmır → metriklər müstəqildir).
  - scale_pos_weight train balansından avtomatik hesablanır.
  - best_iteration None ola biləcəyi hal üçün mühafizə var.
"""
import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
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
VAL_SIZE = 0.20  # train-in daxilindən validation üçün ayrılan hissə
THRESHOLD = 0.50


def load_or_generate() -> pd.DataFrame:
    """Mövcud datasetı oxuyur, yoxdursa yaradır."""
    if DATASET_PATH.exists():
        df = pd.read_csv(DATASET_PATH)
        print(f"Mövcud dataset oxundu: {len(df)} nümunə")
    else:
        print("Dataset tapılmadı, yaradılır...")
        df = generate()
    return df


def make_splits(df: pd.DataFrame) -> tuple:
    """train / validation / test bölgüsü — hamısı stratifikasiyalı.

    Validation dəsti yalnız early stopping üçündür; test dəsti yekun
    qiymətləndirmə üçün toxunulmaz saxlanılır.
    """
    X = df[FEATURES].values
    y = df[TARGET].values

    X_train_full, X_test, y_train_full, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, stratify=y, random_state=RANDOM_STATE
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_full,
        y_train_full,
        test_size=VAL_SIZE,
        stratify=y_train_full,
        random_state=RANDOM_STATE,
    )
    return X_train, X_val, X_test, y_train, y_val, y_test


def compute_scale_pos_weight(y_train: np.ndarray) -> float:
    """neg/pos nisbəti — disbalanslı etiket üçün."""
    pos = int(np.sum(y_train == 1))
    neg = int(np.sum(y_train == 0))
    if pos == 0:
        return 1.0
    return round(neg / pos, 4)


def build_model(scale_pos_weight: float) -> XGBClassifier:
    return XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        eval_metric="auc",
        early_stopping_rounds=20,  # XGBoost 2.x-də konstruktorda verilir
        random_state=RANDOM_STATE,
    )


def evaluate(model: XGBClassifier, X_test, y_test) -> dict:
    y_prob = model.predict_proba(X_test)[:, 1]
    y_pred = (y_prob >= THRESHOLD).astype(int)

    best_iter = model.best_iteration
    return {
        "model_version": MODEL_VERSION,
        "data_note": SYNTHETIC_NOTE,
        "test_size": TEST_SIZE,
        "n_test": int(len(y_test)),
        "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 4),
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
        "best_iteration": int(best_iter) if best_iter is not None else None,
    }


def main() -> None:
    df = load_or_generate()
    X_train, X_val, X_test, y_train, y_val, y_test = make_splits(df)

    spw = compute_scale_pos_weight(y_train)
    print(f"scale_pos_weight (neg/pos): {spw}")

    model = build_model(spw)
    model.fit(
        X_train,
        y_train,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )

    metrics = evaluate(model, X_test, y_test)

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
