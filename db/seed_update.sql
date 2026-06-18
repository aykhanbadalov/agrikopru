-- Demo çiftçilər üçün profil faktörleri — sintetik dəyərlər
UPDATE farmers SET
  farming_history_years = 8,
  tarsim_history_score  = 0.75,
  fertilizer_purchases  = 3,
  climate_risk_score    = 0.20
WHERE phone = '+905001234567';  -- Demo Çiftçi

UPDATE farmers SET
  farming_history_years = 12,
  tarsim_history_score  = 0.85,
  fertilizer_purchases  = 5,
  climate_risk_score    = 0.15
WHERE phone = '+905001111111';  -- Mehmet Yılmaz

UPDATE farmers SET
  farming_history_years = 6,
  tarsim_history_score  = 0.60,
  fertilizer_purchases  = 2,
  climate_risk_score    = 0.30
WHERE phone = '+905002222222';  -- Ayşe Kaya
