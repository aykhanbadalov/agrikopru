const { Router } = require('express');
const db = require('../db');

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
