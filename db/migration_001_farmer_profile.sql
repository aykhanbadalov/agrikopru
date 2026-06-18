ALTER TABLE farmers
  ADD COLUMN IF NOT EXISTS farming_history_years INTEGER,
  ADD COLUMN IF NOT EXISTS tarsim_history_score  NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS fertilizer_purchases  INTEGER,
  ADD COLUMN IF NOT EXISTS climate_risk_score    NUMERIC(4,2);
