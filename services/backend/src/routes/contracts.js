const { Router } = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = Router();

router.get('/', async (req, res, next) => {
  const { farmer_id, status } = req.query;
  try {
    const conditions = [];
    const params = [];
    if (farmer_id) { params.push(farmer_id); conditions.push(`farmer_id = $${params.length}`); }
    if (status)    { params.push(status);    conditions.push(`status = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await db.query(
      `SELECT * FROM contracts ${where} ORDER BY created_at DESC LIMIT 10`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/confirm', async (req, res, next) => {
  const { farmer_id, pin } = req.body;
  try {
    const { rows: farmers } = await db.query(
      'SELECT pin_hash FROM farmers WHERE id = $1',
      [farmer_id]
    );
    if (!farmers.length) return res.status(404).json({ error: 'Çiftçi bulunamadı.' });

    const { pin_hash } = farmers[0];
    if (!pin_hash || !(await bcrypt.compare(String(pin), pin_hash))) {
      return res.status(403).json({ error: 'Yanlış PIN.' });
    }

    const { rows, rowCount } = await db.query(
      `UPDATE contracts
       SET status = 'active', signed_at = NOW()
       WHERE id = $1 AND farmer_id = $2
       RETURNING *`,
      [req.params.id, farmer_id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Sözleşme bulunamadı veya bu çiftçiye ait değil.' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
