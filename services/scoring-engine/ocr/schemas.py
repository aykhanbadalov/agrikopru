from typing import Literal, Optional

from pydantic import BaseModel


class CKSExtractResponse(BaseModel):
    land_size_ha: Optional[float]
    parcel_no: Optional[str]
    raw_text: str
    confidence: float
    warning: Optional[str]
    # Literal sabiti: kodun heç bir yerindən "verified" yazıla bilməz
    source: Literal["ocr_extracted"] = "ocr_extracted"
