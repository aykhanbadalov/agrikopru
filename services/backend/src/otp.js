const OTP_TTL_MS     = 5 * 60 * 1000;   // 5 dəqiqə
const MAX_ATTEMPTS   = 3;
const LOCKOUT_MS     = 15 * 60 * 1000;  // 15 dəqiqə

// key: `${purpose}:${identifier}` → { code, expiresAt, attempts, lockedUntil }
const otpStore = new Map();

function generateOtp(identifier, purpose) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(`${purpose}:${identifier}`, {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    lockedUntil: null,
  });
  return code;
}

function verifyOtp(identifier, purpose, inputCode) {
  const key = `${purpose}:${identifier}`;
  const entry = otpStore.get(key);

  if (!entry) {
    return { ok: false, error: 'Kod bulunamadı veya süresi dolmuş. Yeni kod talep edin.' };
  }

  // Kilit süresi bitmişse sayacı sıfırla
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    entry.attempts = 0;
    entry.lockedUntil = null;
  }

  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    return { ok: false, error: 'Çok fazla hatalı deneme. Lütfen daha sonra tekrar deneyin.', lockedUntil: entry.lockedUntil };
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key);
    return { ok: false, error: 'Kodun süresi dolmuş. Yeni kod talep edin.' };
  }

  if (entry.code !== String(inputCode)) {
    entry.attempts += 1;
    if (entry.attempts >= MAX_ATTEMPTS) {
      entry.lockedUntil = Date.now() + LOCKOUT_MS;
      return { ok: false, error: 'Çok fazla hatalı deneme. Lütfen 15 dakika sonra tekrar deneyin.', lockedUntil: entry.lockedUntil };
    }
    return { ok: false, error: 'Yanlış kod.' };
  }

  otpStore.delete(key);
  return { ok: true };
}

module.exports = { generateOtp, verifyOtp };
