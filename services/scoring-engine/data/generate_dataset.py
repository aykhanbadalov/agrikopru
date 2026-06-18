# SYNTHETIC DATA — not real repayment records.
# Bu fayl sintetik dataset yaradır. Jüriyə və ya istənilən oxuyana
# real data kimi təqdim edilməməlidir.

import numpy as np
import pandas as pd
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import DATASET_PATH

FEATURE_WEIGHTS = {
    "land_size_ha": 0.15,
    "farming_history_years": 0.20,
    "cooperative_member": 0.15,
    "tarsim_history_score": 0.20,
    "fertilizer_purchases": 0.15,
    "climate_risk_score": 0.15,
}

LABEL_NOISE_STD = 0.08
N_SAMPLES = 5000
RANDOM_STATE = 42


def generate(n: int = N_SAMPLES, random_state: int = RANDOM_STATE) -> pd.DataFrame:
    rng = np.random.default_rng(random_state)

    land_size_ha = rng.uniform(0.5, 50.0, n)
    farming_history_years = rng.integers(0, 31, n)
    cooperative_member = rng.integers(0, 2, n)
    tarsim_history_score = rng.uniform(0.0, 1.0, n)
    fertilizer_purchases = rng.integers(0, 21, n)
    climate_risk_score = rng.uniform(0.0, 1.0, n)

    norm_land = (land_size_ha - 0.5) / 49.5
    norm_history = farming_history_years / 30
    norm_coop = cooperative_member.astype(float)
    norm_tarsim = tarsim_history_score
    norm_fert = fertilizer_purchases / 20
    norm_climate = 1.0 - climate_risk_score  # mənfi təsir → tərsinə çevrilir

    rule_score = (
        norm_land    * FEATURE_WEIGHTS["land_size_ha"] +
        norm_history * FEATURE_WEIGHTS["farming_history_years"] +
        norm_coop    * FEATURE_WEIGHTS["cooperative_member"] +
        norm_tarsim  * FEATURE_WEIGHTS["tarsim_history_score"] +
        norm_fert    * FEATURE_WEIGHTS["fertilizer_purchases"] +
        norm_climate * FEATURE_WEIGHTS["climate_risk_score"]
    )

    noise = rng.normal(0.0, LABEL_NOISE_STD, n)
    repaid = ((rule_score + noise) > 0.50).astype(int)

    return pd.DataFrame({
        "land_size_ha": land_size_ha,
        "farming_history_years": farming_history_years,
        "cooperative_member": cooperative_member,
        "tarsim_history_score": tarsim_history_score,
        "fertilizer_purchases": fertilizer_purchases,
        "climate_risk_score": climate_risk_score,
        "repaid": repaid,
        "synthetic": True,
    })


if __name__ == "__main__":
    df = generate()
    DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(DATASET_PATH, index=False)
    pos_rate = df["repaid"].mean()
    print(f"Dataset yaradıldı: {len(df)} nümunə → {DATASET_PATH}")
    print(f"Geri ödəmə nisbəti: {pos_rate:.2%}  |  synthetic=True sütunu mövcuddur")
