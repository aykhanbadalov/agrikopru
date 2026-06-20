const { Router } = require('express');
const multer = require('multer');

const router = Router();
const SCORING_ENGINE_URL = process.env.SCORING_ENGINE_URL || 'http://localhost:8001';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/extract-cks', upload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'Fayl tapılmadı.' });

  const form = new FormData();
  // Tip yoxlamasını scoring engine-ə bırakıyoruz — magic bytes ilə özü aşkarlayır
  form.append('file', new Blob([req.file.buffer], { type: 'application/octet-stream' }), req.file.originalname || 'upload');

  let engineRes;
  try {
    engineRes = await fetch(`${SCORING_ENGINE_URL}/ocr/extract-cks`, { method: 'POST', body: form });
  } catch {
    return res.status(502).json({ error: 'OCR motoruna ulaşılamadı.' });
  }

  const result = await engineRes.json().catch(() => ({}));
  res.status(engineRes.status).json(result);
});

module.exports = router;
