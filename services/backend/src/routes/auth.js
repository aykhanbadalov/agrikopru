const { Router } = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const db = require('../db');
const supabase = require('../supabase');
const { generateOtp, verifyOtp } = require('../otp');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function phoneExists(phone) {
  const [fRes, bRes] = await Promise.all([
    db.query('SELECT id FROM farmers WHERE phone = $1', [phone]),
    db.query('SELECT id FROM buyers WHERE phone = $1', [phone]),
  ]);
  return fRes.rows.length > 0 || bRes.rows.length > 0;
}

router.post('/register', upload.single('cks_document'), async (req, res, next) => {
  const {
    role, phone, password, full_name,
    national_id, cooperative_member, farming_history_years,
    tarsim_history_score, fertilizer_purchases, climate_risk_score, land_size_ha,
    company_name,
  } = req.body;

  if (!role || !phone || !password) {
    return res.status(400).json({ error: 'role, phone ve password zorunludur.' });
  }
  if (role !== 'farmer' && role !== 'buyer') {
    return res.status(400).json({ error: 'role farmer veya buyer olmalıdır.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Şifre en az 8 karakter olmalıdır.' });
  }

  try {
    if (await phoneExists(phone)) {
      return res.status(409).json({ error: 'Bu telefon numarası zaten kayıtlı.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    if (role === 'farmer') {
      if (!full_name) return res.status(400).json({ error: 'full_name zorunludur.' });

      const { rows } = await db.query(
        `INSERT INTO farmers
           (full_name, phone, national_id, cooperative_member,
            farming_history_years, tarsim_history_score,
            fertilizer_purchases, climate_risk_score, password_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, full_name, phone, national_id, cooperative_member,
                   farming_history_years, tarsim_history_score,
                   fertilizer_purchases, climate_risk_score, created_at`,
        [
          full_name, phone, national_id || null,
          cooperative_member === 'true' || cooperative_member === true,
          farming_history_years ? Number(farming_history_years) : null,
          tarsim_history_score ? Number(tarsim_history_score) : null,
          fertilizer_purchases ? Number(fertilizer_purchases) : null,
          climate_risk_score ? Number(climate_risk_score) : null,
          password_hash,
        ]
      );
      const farmer = rows[0];

      if (land_size_ha != null && land_size_ha !== '') {
        await db.query(
          `INSERT INTO parcels (farmer_id, land_size_ha, parcel_code) VALUES ($1, $2, $3)`,
          [farmer.id, Number(land_size_ha), 'REG-' + farmer.id.substring(0, 8)]
        );
      }

      // CKS sənədini Supabase Storage-a yüklə (non-fatal — qeydiyyat yenə də uğurlu sayılır)
      if (req.file) {
        const extMap = {
          'image/jpeg': 'jpg', 'image/png': 'png',
          'image/webp': 'webp', 'application/pdf': 'pdf',
        };
        const ext = extMap[req.file.mimetype] || 'jpg';
        const storagePath = `${farmer.id}/cks.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('cks-documents')
          .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
        if (!upErr) {
          await db.query(
            'UPDATE farmers SET cks_document_path = $1 WHERE id = $2',
            [storagePath, farmer.id]
          );
          farmer.cks_document_path = storagePath;
        }
      }

      const demoCode = generateOtp(phone, 'register');
      return res.status(201).json({ requiresVerification: true, phone, role: 'farmer', demoCode });
    }

    if (role === 'buyer') {
      if (!company_name) return res.status(400).json({ error: 'company_name zorunludur.' });

      const { rows } = await db.query(
        `INSERT INTO buyers (company_name, phone, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, company_name, phone, created_at`,
        [company_name, phone, password_hash]
      );
      const demoCode = generateOtp(phone, 'register');
      return res.status(201).json({ requiresVerification: true, phone, role: 'buyer', demoCode });
    }
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: 'phone ve password zorunludur.' });
  }

  try {
    const { rows: farmerRows } = await db.query(
      `SELECT f.*, p.land_size_ha, p.region
       FROM farmers f
       LEFT JOIN parcels p ON p.farmer_id = f.id
       WHERE f.phone = $1
       LIMIT 1`,
      [phone]
    );
    if (farmerRows.length > 0) {
      const farmer = farmerRows[0];
      if (!farmer.password_hash) {
        return res.status(401).json({ error: 'Telefon veya şifre hatalı.' });
      }
      const ok = await bcrypt.compare(password, farmer.password_hash);
      if (!ok) return res.status(401).json({ error: 'Telefon veya şifre hatalı.' });

      const { password_hash: _ph, pin_hash: _pin, ...safeUser } = farmer;
      const { rows: scores } = await db.query(
        'SELECT * FROM credit_scores WHERE farmer_id = $1 ORDER BY created_at DESC LIMIT 1',
        [farmer.id]
      );
      return res.json({
        role: 'farmer',
        user: { ...safeUser, latest_score: scores[0] || null },
      });
    }

    const { rows: buyerRows } = await db.query(
      'SELECT * FROM buyers WHERE phone = $1',
      [phone]
    );
    if (buyerRows.length > 0) {
      const buyer = buyerRows[0];
      const ok = await bcrypt.compare(password, buyer.password_hash);
      if (!ok) return res.status(401).json({ error: 'Telefon veya şifre hatalı.' });

      const { password_hash: _ph, ...safeUser } = buyer;
      return res.json({ role: 'buyer', user: safeUser });
    }

    return res.status(401).json({ error: 'Telefon veya şifre hatalı.' });
  } catch (err) {
    next(err);
  }
});

router.post('/verify-registration', async (req, res, next) => {
  const { phone, role, code } = req.body;
  if (!phone || !role || !code) {
    return res.status(400).json({ error: 'phone, role ve code zorunludur.' });
  }
  if (role !== 'farmer' && role !== 'buyer') {
    return res.status(400).json({ error: 'role farmer veya buyer olmalıdır.' });
  }

  const result = verifyOtp(phone, 'register', code);
  if (!result.ok) {
    return res.status(result.lockedUntil ? 429 : 400).json({
      error: result.error,
      ...(result.lockedUntil && { lockedUntil: result.lockedUntil }),
    });
  }

  try {
    const table = role === 'farmer' ? 'farmers' : 'buyers';
    await db.query(`UPDATE ${table} SET phone_verified = true WHERE phone = $1`, [phone]);

    if (role === 'farmer') {
      const { rows: farmerRows } = await db.query(
        `SELECT f.*, p.land_size_ha, p.region
         FROM farmers f
         LEFT JOIN parcels p ON p.farmer_id = f.id
         WHERE f.phone = $1
         LIMIT 1`,
        [phone]
      );
      const farmer = farmerRows[0];
      const { password_hash: _ph, pin_hash: _pin, ...safeUser } = farmer;
      const { rows: scores } = await db.query(
        'SELECT * FROM credit_scores WHERE farmer_id = $1 ORDER BY created_at DESC LIMIT 1',
        [farmer.id]
      );
      return res.json({ role: 'farmer', user: { ...safeUser, latest_score: scores[0] || null } });
    }

    const { rows: buyerRows } = await db.query(
      'SELECT id, company_name, phone, created_at FROM buyers WHERE phone = $1',
      [phone]
    );
    return res.json({ role: 'buyer', user: buyerRows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/resend-otp', async (req, res, next) => {
  const { phone, role } = req.body;
  if (!phone || !role) return res.status(400).json({ error: 'phone ve role zorunludur.' });
  if (role !== 'farmer' && role !== 'buyer') return res.status(400).json({ error: 'role farmer veya buyer olmalıdır.' });
  try {
    const table = role === 'farmer' ? 'farmers' : 'buyers';
    const { rows } = await db.query(`SELECT id FROM ${table} WHERE phone = $1`, [phone]);
    if (!rows.length) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    const code = generateOtp(phone, 'register');
    res.json({ demoCode: code });
  } catch (err) {
    next(err);
  }
});

router.post('/change-password', async (req, res, next) => {
  const { phone, role, old_password, new_password } = req.body;
  if (!phone || !role || !old_password || !new_password) {
    return res.status(400).json({ error: 'phone, role, old_password, new_password zorunludur.' });
  }
  if (role !== 'farmer' && role !== 'buyer') {
    return res.status(400).json({ error: 'role farmer veya buyer olmalıdır.' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Şifre en az 8 karakter olmalıdır.' });
  }

  try {
    const table = role === 'farmer' ? 'farmers' : 'buyers';
    const { rows } = await db.query(
      `SELECT id, password_hash FROM ${table} WHERE phone = $1`,
      [phone]
    );
    if (!rows.length) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

    const ok = await bcrypt.compare(old_password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Mevcut şifre hatalı.' });

    const new_hash = await bcrypt.hash(new_password, 10);
    await db.query(`UPDATE ${table} SET password_hash = $1 WHERE id = $2`, [new_hash, rows[0].id]);

    res.json({ message: 'Şifre başarıyla güncellendi.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
