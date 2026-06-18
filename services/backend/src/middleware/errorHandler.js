// 23503 (foreign_key_violation) buraya gəlmir:
//   - DELETE /farmers/:id öz try/catch-ində lokal tutur → 409
//   - Digər route-larda 23503 → 404 (valideyn tapılmadı)
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Bu telefon numarası zaten kayıtlı.' });
  }
  if (err.code === '23503') {
    return res.status(404).json({ error: 'Çiftçi bulunamadı.' });
  }
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Dahili sunucu hatası.' });
}

module.exports = errorHandler;
