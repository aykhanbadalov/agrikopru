const { Router } = require('express');
const db = require('../db');
const { generateOtp, verifyOtp } = require('../otp');

const router = Router();

router.get('/', async (req, res, next) => {
  const { farmer_id, status, buyer_name } = req.query;
  try {
    const conditions = [];
    const params = [];
    if (farmer_id)  { params.push(farmer_id);  conditions.push(`farmer_id = $${params.length}`); }
    if (status)     { params.push(status);     conditions.push(`status = $${params.length}`); }
    if (buyer_name) { params.push(buyer_name); conditions.push(`buyer_name = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await db.query(
      `SELECT * FROM contracts ${where} ORDER BY created_at DESC LIMIT 50`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// send-create-otp MUST be before /:id routes to avoid Express matching "send-create-otp" as :id
router.post('/send-create-otp', async (req, res, next) => {
  const { buyer_phone } = req.body;
  if (!buyer_phone) return res.status(400).json({ error: 'buyer_phone zorunludur.' });
  try {
    const code = generateOtp(buyer_phone, 'create-contract');
    res.json({ demoCode: code });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { farmer_id, buyer_name, product_type, quantity_kg, price_per_kg, buyer_phone, code } = req.body;

  if (!buyer_phone || !code) {
    return res.status(400).json({ error: 'buyer_phone ve code zorunludur.' });
  }

  const otpResult = verifyOtp(buyer_phone, 'create-contract', code);
  if (!otpResult.ok) {
    return res.status(otpResult.lockedUntil ? 429 : 403).json({
      error: otpResult.error,
      ...(otpResult.lockedUntil && { lockedUntil: otpResult.lockedUntil }),
    });
  }

  const total_value_tl = Number(quantity_kg) * Number(price_per_kg);
  try {
    const { rows } = await db.query(
      `INSERT INTO contracts (farmer_id, buyer_name, product_type, quantity_kg, price_per_kg, total_value_tl)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [farmer_id, buyer_name, product_type, quantity_kg, price_per_kg, total_value_tl]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/send-confirm-otp', async (req, res, next) => {
  const { farmer_id } = req.body;
  try {
    const { rows } = await db.query('SELECT phone FROM farmers WHERE id = $1', [farmer_id]);
    if (!rows.length) return res.status(404).json({ error: 'Çiftçi bulunamadı.' });
    const code = generateOtp(rows[0].phone, 'confirm');
    res.json({ demoCode: code });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/confirm', async (req, res, next) => {
  const { farmer_id, code } = req.body;

  try {
    const { rows: farmers } = await db.query('SELECT phone FROM farmers WHERE id = $1', [farmer_id]);
    if (!farmers.length) return res.status(404).json({ error: 'Çiftçi bulunamadı.' });

    const otpResult = verifyOtp(farmers[0].phone, 'confirm', code);
    if (!otpResult.ok) {
      return res.status(otpResult.lockedUntil ? 429 : 403).json({
        error: otpResult.error,
        ...(otpResult.lockedUntil && { lockedUntil: otpResult.lockedUntil }),
      });
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
