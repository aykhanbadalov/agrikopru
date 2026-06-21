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

try:
    import cv2
    import numpy as np
    _CV2_AVAILABLE = True
except ImportError:
    _CV2_AVAILABLE = False

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import OCR_CONFIDENCE_THRESHOLD, OCR_LANG

def _detect_mime(data: bytes) -> Optional[str]:
    if data[:3] == b'\xff\xd8\xff':
        return "image/jpeg"
    if data[:4] == b'\x89PNG':
        return "image/png"
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return "image/webp"
    if data[:4] == b'%PDF':
        return "application/pdf"
    return None

# Hektar regex-ləri: "12,50 Ha", "Alan: 8.75 ha"
_HA_PATTERNS = [
    re.compile(r'(\d+[.,]\d+)\s*[Hh][Aa]'),
    re.compile(r'[Aa]lan\s*[:=]\s*(\d+[.,]\d+)'),
]

# Dekar regex-ləri: "12,50 Dekar" → _parse_float → × 0.1 → ha
_DEKAR_PATTERNS = [
    re.compile(r'(\d+[.,]\d+)\s*[Dd]ekar'),
]

# (da) vahidli dekar pattern-ləri: nöqtə HƏMİŞƏ onluq ayırıcıdır
# (bir parsel üçün dekar dəyəri heç vaxt 1000-dən böyük olmur)
_DEKAR_DA_PATTERNS = [
    re.compile(r'Toplam\s+Kullan[ıi]lan\s+Alan\s*\(da\)\s*:\s*([\d.]+)'),
    re.compile(r'TOPLAM\s+([\d.]+)'),
]

# Metrekare regex-ləri: "17.500 metrekare" → nöqtə min ayırıcı → /10000 → ha
_METREKARE_PATTERNS = [
    re.compile(r'TOPLAM\s+ARAZİ\s+VARLIĞI\s*=\s*([\d.]+)\s*metrekare'),
    re.compile(r'([\d.]+)\s*metrekare'),
]

# Şəxsiyyət məlumatı pattern-ləri: ÇKS sənədi üzrə şəxsi sahələr
_NATIONAL_ID_PATTERN = re.compile(r'T\.?C\.?\s*Kimlik\s*No\s*[:\-]?\s*(\d{11})')
_FULL_NAME_PATTERN   = re.compile(r'Ad[ıi]\s*Soyad[ıi]\s*[:\-]?\s*([A-ZÇŞĞÜÖİ ]{3,})')
_BIRTH_DATE_PATTERN  = re.compile(r'Do[ğg]um\s*Tarihi\s*[:\-]?\s*(\d{2}/\d{2}/\d{4})')
_SETTLEMENT_PATTERN  = re.compile(r'Yerle[şs]im\s*Birimi\s*[:\-]?\s*(.+?)(?:\n|$)')
_PHONE_CKS_PATTERN   = re.compile(r'[Cc]ep\s*[:\-]?\s*[\D]*(\d{10,11})')

# Parsel nömrəsi: "Parsel No: 123", "Ada/Parsel: 456/78"
_PARCEL_PATTERNS = [
    re.compile(r'[Pp]arsel\s*[Nn]o\s*[:=]?\s*(\d+)'),
    re.compile(r'[Aa]da\s*/\s*[Pp]arsel\s*[:=]?\s*(\d+/\d+)'),
]

# Yalnız rəqəm saxlayan xana üçün pattern (ha dəyəri kimi oxuna bilər)
_NUMERIC_CELL = re.compile(r'^[\d.,\s]+$')


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
    for pat in _DEKAR_DA_PATTERNS:
        m = pat.search(text)
        if m:
            # Nöqtəni vergüllə əvəz et: "209.112" → "209,112" → 209.112 float
            return round(_parse_float(m.group(1).replace('.', ',')) * 0.1, 4)
    for pat in _METREKARE_PATTERNS:
        m = pat.search(text)
        if m:
            # Bütün nöqtələr min ayırıcıdır → sil → int → ha-ya çevir
            m2 = int(m.group(1).replace('.', ''))
            return round(m2 / 10000, 4)
    return None


def _extract_national_id(text: str) -> Optional[str]:
    m = _NATIONAL_ID_PATTERN.search(text)
    return m.group(1) if m else None


def _extract_full_name(text: str) -> Optional[str]:
    m = _FULL_NAME_PATTERN.search(text)
    return m.group(1).strip() if m else None


def _extract_birth_date(text: str) -> Optional[str]:
    m = _BIRTH_DATE_PATTERN.search(text)
    return m.group(1) if m else None


def _extract_settlement(text: str) -> Optional[str]:
    m = _SETTLEMENT_PATTERN.search(text)
    return m.group(1).strip() if m else None


def _extract_phone_cks(text: str) -> Optional[str]:
    m = _PHONE_CKS_PATTERN.search(text)
    if m:
        digits = re.sub(r'\D', '', m.group(1))
        return digits[-10:] if len(digits) >= 10 else None
    return None


def _reconstruct_lines(
    data: dict, img_height: int,
    top_fraction: float = 0.40, line_tol: int = 15,
) -> str:
    """Tesseract söz-koordinat məlumatından vizual sətirləri yenidən qur.

    Sütunlu kimlik qutuları üçün: eyni vizual sətirdəki sözlər 'top'
    dəyərinə görə qruplaşdırılır (tolerans line_tol px), sonra 'left'
    üzrə soldan-sağa sıralanıb birləşdirilir.
    """
    cutoff = int(img_height * top_fraction)
    words = [
        (data['left'][i], data['top'][i], data['text'][i])
        for i in range(len(data['text']))
        if int(data['conf'][i]) > 0
        and data['text'][i].strip()
        and data['top'][i] < cutoff
    ]
    if not words:
        return ''
    words.sort(key=lambda w: (w[1], w[0]))
    groups: list = []
    current = [words[0]]
    for word in words[1:]:
        if abs(word[1] - current[0][1]) <= line_tol:
            current.append(word)
        else:
            groups.append(sorted(current, key=lambda w: w[0]))
            current = [word]
    groups.append(sorted(current, key=lambda w: w[0]))
    return '\n'.join(' '.join(w[2] for w in g) for g in groups)


def _extract_parcel_no(text: str) -> Optional[str]:
    for pat in _PARCEL_PATTERNS:
        m = pat.search(text)
        if m:
            return m.group(1)
    return None


def _extract_from_table(pil_img: "Image.Image") -> Optional[float]:
    """OpenCV ilə cədvəl xanalarını aşkarlayıb TOPLAM sütunundan land_size_ha oxu."""
    if not _CV2_AVAILABLE:
        return None

    img_arr = np.array(pil_img)
    h, w = img_arr.shape[:2]

    # Binary threshold (tərsinə çevir: xətlər ağ, fon qara)
    _, binary = cv2.threshold(img_arr, 150, 255, cv2.THRESH_BINARY_INV)

    # Horizontal xətlər
    kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (w // 30, 1))
    h_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel_h)

    # Vertical xətlər
    kernel_v = cv2.getStructuringElement(cv2.MORPH_RECT, (1, h // 30))
    v_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel_v)

    # Cədvəl maskası = h + v xətlər, boşluqları bağla
    table_mask = cv2.add(h_lines, v_lines)
    dilate_k = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    table_mask = cv2.dilate(table_mask, dilate_k, iterations=3)

    contours, _ = cv2.findContours(table_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Hücrə siyahısı: (cx, cy, cell_w, cell_h, text)
    cells = []
    for cnt in contours:
        x, y, cw, ch = cv2.boundingRect(cnt)
        if cw * ch < 500:  # noise filteri
            continue

        # ROI — 4px padding
        pad = 4
        x1 = max(x - pad, 0)
        y1 = max(y - pad, 0)
        x2 = min(x + cw + pad, w)
        y2 = min(y + ch + pad, h)
        roi = img_arr[y1:y2, x1:x2]
        roi_pil = Image.fromarray(roi)

        cell_text = pytesseract.image_to_string(
            roi_pil, lang=OCR_LANG, config='--psm 6 --oem 3'
        ).strip()
        cells.append((x, y, cw, ch, cell_text))

    # (y, x) üzrə sırala → cərgə-cərgə oxu
    cells.sort(key=lambda c: (c[1], c[0]))

    # "TOPLAM" / "GENEL TOPLAM" xanasını tap
    for i, (cx, cy, cw, ch, text) in enumerate(cells):
        upper = text.upper().replace('\n', ' ').strip()
        if 'TOPLAM' not in upper:
            continue

        # Eyni cərgədə sağ tərəfdəki xanaları axtar
        half_h = ch / 2
        for nx, ny, nw, nh, ntext in cells:
            if nx <= cx:
                continue
            if abs(ny - cy) > half_h:
                continue
            # Rəqəmli xanamı?
            clean = ntext.strip().replace('\n', ' ')
            if not clean:
                continue
            # Sadə rəqəm yoxlaması
            candidate = re.sub(r'\s+', '', clean)
            if re.fullmatch(r'[\d.,]+', candidate):
                try:
                    val = _parse_float(candidate)
                    # Məntiqli aralıq: 0.01 ha – 10000 ha
                    if 0.01 <= val <= 10000:
                        return round(val, 4)
                except ValueError:
                    continue

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

    detected = _detect_mime(data)
    if detected is None:
        raise HTTPException(
            415,
            "Dəstəklənməyən fayl tipi. JPG, PNG, WebP və ya PDF yükləyin.",
        )

    img = _preprocess(_to_pil(data, detected))

    # Söz-koordinat məlumatı: həm etibarlılıq, həm kimlik sətir-yenidənqurma üçün
    data_dict = pytesseract.image_to_data(img, lang=OCR_LANG, output_type=Output.DICT)
    confs = [int(c) for c in data_dict['conf'] if int(c) >= 0]
    confidence = (sum(confs) / len(confs) / 100.0) if confs else 0.0

    id_text = _reconstruct_lines(data_dict, img.height)
    raw_text = pytesseract.image_to_string(img, lang=OCR_LANG)

    land_size_ha = _extract_land_size(raw_text)
    parcel_no = _extract_parcel_no(raw_text)

    # OpenCV cədvəl aşkarlaması — nəticə tapılırsa regex nəticəsini üstələyir
    if _CV2_AVAILABLE:
        cv_result = _extract_from_table(img)
        if cv_result is not None:
            land_size_ha = cv_result

    warning = None
    if confidence < OCR_CONFIDENCE_THRESHOLD:
        warning = "Sənəd aydın deyil, əl ilə yoxlayın."

    return CKSExtractResponse(
        land_size_ha=land_size_ha,
        parcel_no=parcel_no,
        raw_text=raw_text,
        confidence=round(confidence, 4),
        warning=warning,
        national_id=_extract_national_id(id_text),
        full_name=_extract_full_name(id_text),
        birth_date=_extract_birth_date(id_text),
        settlement=_extract_settlement(id_text),
        # id_text-də "Cep:" etiketi ilə rəqəm fərqli sətirə düşə bilər (y-koordinat
        # sürüşməsi); raw_text-də həmişə eyni sətirdədir → ehtiyat olaraq yoxlanır
        phone=_extract_phone_cks(id_text) or _extract_phone_cks(raw_text),
    )
