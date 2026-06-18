from typing import Dict, Literal, Optional

from pydantic import BaseModel, Field


class ScoreRequest(BaseModel):
    farmer_id: Optional[str] = None
    land_size_ha: float = Field(..., ge=0.5, le=50.0)
    farming_history_years: int = Field(..., ge=0, le=30)
    cooperative_member: bool
    tarsim_history_score: float = Field(..., ge=0.0, le=1.0)
    fertilizer_purchases: int = Field(..., ge=0, le=20)
    climate_risk_score: float = Field(..., ge=0.0, le=1.0)
    region_profitability_index: Optional[float] = Field(default=None, gt=0.0)


class ScoreResponse(BaseModel):
    score: int
    repayment_probability: float
    risk_band: Literal["LOW", "MEDIUM", "HIGH"]
    credit_limit_tl: Optional[float]
    model_version: str
    data_note: str
    feature_contributions: Dict[str, float]
