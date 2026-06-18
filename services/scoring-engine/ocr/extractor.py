import re
from io import BytesIO
from pathlib import Path
from typing import Optional

from fastapi import HTTPException

# Sistem paketlərini (pytesseract, Pillow, pdf2image) import zamanı yoxla
try:
    import pytesseract
    from pytesseract import Output
    from PIL import Image
except ImportError as exc:
    raise RuntimeError(
        "pytesseract və ya Pillow tapılmadı. "
        "`pip install pytesseract Pillow` ilə quraşdırın."
    ) from exc

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import OCR_CONFIDENCE_THRESHOLD, OCR_LANG

ALLOWED_MIME = {"image/jpeg", "image/png", "application/pdf"}

# Hektar regex-ləri: "12,50 Ha", "Alan: 8.75 ha"
_HA_PATTERNS = [
    re.compile(r'(\d+[.,]\d+)\s*[Hh][Aa]'),
    re.compile(r'[Aa]lan\s*[:=]\s*(\d+[.,]\d+)'),
]

# Dekar regex-ləri: "12,50 Dekar" → × 0.1 → ha
_DEKAR_PATTERNS = [
    re.compile(r'(\d+[.,]\d+)\s*[Dd]ekar'),
]

# Metrekare regex-ləri: "17.500 metrekare" → nöqtə min ayırıcı → /10000 → ha
_METREKARE_PATTERNS = [
    re.compile(r'TOPLAM\s+ARAZİ\s+VARLIĞI\s*=\s*([\d.]+)\s*metrekare'),
    re.compile(r'([\d.]+)\s*metrekare'),
]

# Parsel nömrəsi: "Parsel No: 123", "Ada/Parsel: 456/78"
_PARCEL_PATTERNS = [
    re.compile(r'[Pp]arsel\s*[Nn]o\s*[:=]?\s*(\d+)'),
    re.compile(r'[Aa]da\s*/\s*[Pp]arsel\s*[:=]?\s*(\d+/\d+)'),
]


def _parse_float(s: str) -> float:
    # "17.500" → nöqtə 3 rəqəmdən əvvəl → min ayırıcı → 17500
    if re.fullmatch(r'\d+\.\d{3}', s.strip()):
        return float(s.replace('.', ''))
    # "12,50" → vergül onluq ayırıcı → 12.50
    return float(s.replace(',', '.'))


def _extract_land_size(text: str) -> Optional[float]:
    for pat in _HA_PATTERNS:
        m = pat.search(text)
        if m:
            return round(_parse_float(m.group(1)), 4)
    for pat in _DEKAR_PATTERNS:
        m = pat.search(text)
        if m:
            return round(_parse_float(m.group(1)) * 0.1, 4)
    for pat in _METREKARE_PATTERNS:
        m = pat.search(text)
        if m:
            # Bütün nöqtələr min ayırıcıdır → sil → int → ha-ya çevir
            m2 = int(m.group(1).replace('.', ''))
            return round(m2 / 10000, 4)
    return None


def _extract_parcel_no(text: str) -> Optional[str]:
    for pat in _PARCEL_PATTERNS:
        m = pat.search(text)
        if m:
            return m.group(1)
    return None


def _to_pil(data: bytes, content_type: Optional[str]) -> Image.Image:
    if content_type == "application/pdf":
        try:
            from pdf2image import convert_from_bytes
        except ImportError as exc:
            raise RuntimeError(
                "pdf2image tapılmadı. `pip install pdf2image` və "
                "`brew install poppler` ilə quraşdırın."
            ) from exc
        pages = convert_from_bytes(data, dpi=300)
        if not pages:
            raise HTTPException(422, "PDF-dən şəkil çıxarıla bilmədi.")
        return pages[0]
    return Image.open(BytesIO(data))


def _preprocess(img: Image.Image) -> Image.Image:
    img = img.convert("L")  # grayscale
    if img.width < 1500:
        img = img.resize((img.width * 2, img.height * 2), Image.LANCZOS)
    return img


def extract_from_cks(data: bytes, content_type: Optional[str]) -> "CKSExtractResponse":
    from ocr.schemas import CKSExtractResponse

    if content_type not in ALLOWED_MIME:
        raise HTTPException(
            415,
            f"Dəstəklənməyən fayl tipi: {content_type}. "
            "JPG, PNG və ya PDF yükləyin.",
        )

    img = _preprocess(_to_pil(data, content_type))

    # Söz səviyyəsində etibarlılıq
    import pandas as pd
    df = pytesseract.image_to_data(img, lang=OCR_LANG, output_type=Output.DATAFRAME)
    valid = df[df["conf"] >= 0]["conf"]
    confidence = float(valid.mean()) / 100.0 if not valid.empty else 0.0

    raw_text = pytesseract.image_to_string(img, lang=OCR_LANG)

    land_size_ha = _extract_land_size(raw_text)
    parcel_no = _extract_parcel_no(raw_text)

    warning = None
    if confidence < OCR_CONFIDENCE_THRESHOLD:
        warning = "Sənəd aydın deyil, əl ilə yoxlayın."

    return CKSExtractResponse(
        land_size_ha=land_size_ha,
        parcel_no=parcel_no,
        raw_text=raw_text,
        confidence=round(confidence, 4),
        warning=warning,
    )
