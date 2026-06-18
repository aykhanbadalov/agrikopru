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

// farmers cədvəlindən oxunan/yazılan profil faktörləri
const DB_PROFILE_FIELDS = [
  'cooperative_member',
  'farming_history_years',
  'tarsim_history_score',
  'fertilizer_purchases',
  'climate_risk_score',
];

router.post('/', async (req, res, next) => {
  const { farmer_id, ...rest } = req.body;

  const payload = { farmer_id };
  for (const field of SCORE_FIELDS) {
    if (rest[field] !== undefined) payload[field] = rest[field];
  }

  // DB-dən farmer profil faktörlərini al
  let dbFarmer = {};
  try {
    const { rows } = await db.query(
      `SELECT cooperative_member, farming_history_years,
              tarsim_history_score, fertilizer_purchases, climate_risk_score
       FROM farmers WHERE id = $1`,
      [farmer_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Çiftçi bulunamadı.' });
    dbFarmer = rows[0];
  } catch (err) {
    return next(err);
  }

  // DB-dən parsel məlumatını al
  try {
    const parcelResult = await db.query(
      'SELECT land_size_ha FROM parcels WHERE farmer_id = $1 LIMIT 1',
      [farmer_id]
    );
    if (parcelResult.rows.length > 0) {
      if (!payload.land_size_ha) payload.land_size_ha = parcelResult.rows[0].land_size_ha;
    }
  } catch (err) {
    return next(err);
  }

  // Merge: body > DB (body-dən gəlməyən faktörü DB-dən götür)
  for (const field of DB_PROFILE_FIELDS) {
    if (payload[field] === undefined && dbFarmer[field] !== null && dbFarmer[field] !== undefined) {
      payload[field] = dbFarmer[field];
    }
  }

  // region_profitability_index DB-də yoxdur, default 1.0
  if (!payload.region_profitability_index) payload.region_profitability_index = 1.0;

  // Body-dən gələn profil faktörlərini farmers cədvəlinə yaz
  try {
    const updatable = DB_PROFILE_FIELDS.filter(f => rest[f] !== undefined);
    if (updatable.length > 0) {
      const sets = updatable.map((f, i) => `${f} = $${i + 2}`).join(', ');
      const vals = updatable.map(f => rest[f]);
      await db.query(`UPDATE farmers SET ${sets} WHERE id = $1`, [farmer_id, ...vals]);
    }
  } catch (err) {
    return next(err);
  }

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
