const { Router } = require('express');
const db = require('../db');

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    if (req.query.phone) {
      const { rows: farmers } = await db.query(
        'SELECT * FROM farmers WHERE phone = $1',
        [req.query.phone]
      );
      if (!farmers.length) return res.status(404).json({ error: 'Çiftçi bulunamadı.' });
      const { rows: scores } = await db.query(
        'SELECT * FROM credit_scores WHERE farmer_id = $1 ORDER BY created_at DESC LIMIT 1',
        [farmers[0].id]
      );
      return res.json({ ...farmers[0], latest_score: scores[0] || null });
    }

    const limit  = Math.min(Number(req.query.limit)  || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const { rows } = await db.query(
      'SELECT * FROM farmers ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { full_name, phone, national_id, cooperative_member } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO farmers (full_name, phone, national_id, cooperative_member)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [full_name, phone, national_id || null, cooperative_member ?? false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/score-history', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT score, risk_band, created_at
       FROM credit_scores
       WHERE farmer_id = $1
       ORDER BY created_at ASC
       LIMIT 10`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows: farmers } = await db.query(
      'SELECT * FROM farmers WHERE id = $1',
      [req.params.id]
    );
    if (!farmers.length) return res.status(404).json({ error: 'Çiftçi bulunamadı.' });

    const { rows: scores } = await db.query(
      `SELECT * FROM credit_scores WHERE farmer_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [req.params.id]
    );

    res.json({ ...farmers[0], latest_score: scores[0] || null });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  const { full_name, phone, national_id, cooperative_member, land_size_ha } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE farmers
       SET full_name=$1, phone=$2, national_id=$3, cooperative_member=$4
       WHERE id=$5
       RETURNING *`,
      [full_name, phone, national_id || null, cooperative_member ?? false, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Çiftçi bulunamadı.' });

    if (land_size_ha !== undefined) {
      const { rows: existing } = await db.query(
        'SELECT id FROM parcels WHERE farmer_id = $1 LIMIT 1',
        [req.params.id]
      );
      if (existing.length > 0) {
        await db.query('UPDATE parcels SET land_size_ha = $1 WHERE id = $2', [land_size_ha, existing[0].id]);
      } else {
        await db.query(
          "INSERT INTO parcels (farmer_id, land_size_ha, parcel_code) VALUES ($1, $2, 'OCR-' || LEFT($1::text, 8))",
          [req.params.id, land_size_ha]
        );
      }
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM farmers WHERE id=$1 RETURNING id',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Çiftçi bulunamadı.' });
    res.status(204).send();
  } catch (err) {
    // 23503: alt cədvəllərdə (credit_scores, contracts) bağlı sətir var
    if (err.code === '23503') {
      return res.status(409).json({ error: 'Bu çiftçinin geçmişi var, silinemez.' });
    }
    next(err);
  }
});

module.exports = router;
