const { Router } = require('express');
const fetch = require('node-fetch');
const db = require('../db');

const router = Router();

const SCORING_ENGINE_URL = process.env.SCORING_ENGINE_URL || 'http://localhost:8001';

const SCORE_FIELDS = [
  'land_size_ha',
  'farming_history_years',
  'cooperative_member',
  'tarsim_history_score',
  'fertilizer_purchases',
  'climate_risk_score',
  'region_profitability_index',
];

router.post('/', async (req, res, next) => {
  const { farmer_id, ...rest } = req.body;

  const payload = { farmer_id };
  for (const field of SCORE_FIELDS) {
    if (rest[field] !== undefined) payload[field] = rest[field];
  }

  // DB-dən parsel məlumatını al
  try {
    const parcelResult = await db.query(
      'SELECT land_size_ha FROM parcels WHERE farmer_id = $1 LIMIT 1',
      [farmer_id]
    );
    if (parcelResult.rows.length > 0) {
      const parcel = parcelResult.rows[0];
      if (!payload.land_size_ha) payload.land_size_ha = parcel.land_size_ha;
    }
  } catch (err) {
    return next(err);
  }
  // region_profitability_index DB-də yoxdur, default 1.0 istifadə et
  if (!payload.region_profitability_index) payload.region_profitability_index = 1.0;

  let engineRes;
  try {
    engineRes = await fetch(`${SCORING_ENGINE_URL}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    return res.status(502).json({ error: 'Skor motoruna ulaşılamadı.' });
  }

  if (!engineRes.ok) {
    const detail = await engineRes.text();
    return res.status(502).json({ error: 'Skor motoru hatası.', detail });
  }

  const result = await engineRes.json();

  try {
    await db.query(
      `INSERT INTO credit_scores
         (farmer_id, score, repayment_probability, risk_band, credit_limit_tl,
          model_version, data_note, input_snapshot, feature_contributions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        farmer_id || null,
        result.score,
        result.repayment_probability,
        result.risk_band,
        result.credit_limit_tl,
        result.model_version,
        result.data_note,
        JSON.stringify(payload),
        JSON.stringify(result.feature_contributions),
      ]
    );
  } catch (err) {
    return next(err);
  }

  res.json(result);
});

module.exports = router;
