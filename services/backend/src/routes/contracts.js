const { Router } = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = Router();

const PIN_MAX_ATTEMPTS = 3;
const PIN_LOCKOUT_MS   = 15 * 60 * 1000; // 15 dəqiqə

// key: `${contractId}:${farmerId}` → { attempts: number, lockedUntil: number|null }
const pinAttempts = new Map();

function getPinEntry(key) {
  if (!pinAttempts.has(key)) pinAttempts.set(key, { attempts: 0, lockedUntil: null });
  return pinAttempts.get(key);
}

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

router.post('/', async (req, res, next) => {
  const { farmer_id, buyer_name, product_type, quantity_kg, price_per_kg } = req.body;
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

router.post('/:id/confirm', async (req, res, next) => {
  const { farmer_id, pin } = req.body;
  const key = `${req.params.id}:${farmer_id}`;
  const entry = getPinEntry(key);

  // Kilit müddəti bitibsə sayğacı sıfırla
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    entry.attempts = 0;
    entry.lockedUntil = null;
  }

  // Kilit aktivdirsə dərhal rədd et
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    return res.status(429).json({
      error: 'Çok fazla hatalı PIN denemesi. Lütfen daha sonra tekrar deneyin.',
      lockedUntil: entry.lockedUntil,
    });
  }

  try {
    const { rows: farmers } = await db.query(
      'SELECT pin_hash FROM farmers WHERE id = $1',
      [farmer_id]
    );
    if (!farmers.length) return res.status(404).json({ error: 'Çiftçi bulunamadı.' });

    const { pin_hash } = farmers[0];
    if (!pin_hash || !(await bcrypt.compare(String(pin), pin_hash))) {
      entry.attempts += 1;
      if (entry.attempts >= PIN_MAX_ATTEMPTS) {
        entry.lockedUntil = Date.now() + PIN_LOCKOUT_MS;
        return res.status(429).json({
          error: 'Çok fazla hatalı PIN denemesi. Lütfen daha sonra tekrar deneyin.',
          lockedUntil: entry.lockedUntil,
        });
      }
      return res.status(403).json({ error: 'Yanlış PIN.' });
    }

    // Doğru PIN — sayğacı sıfırla
    pinAttempts.delete(key);

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
