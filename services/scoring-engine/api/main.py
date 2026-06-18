import json
import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile

sys.path.insert(0, str(Path(__file__).parent.parent))

from api.schemas import ScoreRequest, ScoreResponse
from api.scorer import load_model, score_request
from config import OCR_MAX_FILE_MB
from ocr.extractor import extract_from_cks
from ocr.schemas import CKSExtractResponse

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        load_model()
        logger.info("Model yükləndi.")
    except FileNotFoundError as exc:
        logger.error(str(exc))
        raise RuntimeError(str(exc)) from exc
    yield


app = FastAPI(
    title="AgriKöprü Skor Mühərriki",
    version="1.0.0",
    description="Sintetik dataset üzərində təlim edilmiş kredit skoru API-si.",
    lifespan=lifespan,
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/score", response_model=ScoreResponse)
def score(req: ScoreRequest):
    try:
        result = score_request(req)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    logger.info(json.dumps({
        "ts": datetime.now(timezone.utc).isoformat(),
        "farmer_id": req.farmer_id,
        "score": result.score,
        "risk_band": result.risk_band,
    }, ensure_ascii=False))

    return result


@app.post("/ocr/extract-cks", response_model=CKSExtractResponse)
async def extract_cks(file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > OCR_MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(413, f"Fayl {OCR_MAX_FILE_MB} MB həddini aşır.")

    result = extract_from_cks(data, file.content_type)

    logger.info(json.dumps({
        "ts": datetime.now(timezone.utc).isoformat(),
        "endpoint": "ocr/extract-cks",
        "confidence": result.confidence,
        "land_size_ha": result.land_size_ha,
        "parcel_no": result.parcel_no,
        "has_warning": result.warning is not None,
    }, ensure_ascii=False))

    return result
