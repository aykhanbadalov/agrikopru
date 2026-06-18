-- DEMO DATA — real istifadəçi məlumatı deyil.
-- Demo PIN: "1234"  (bcrypt hash, salt rounds=10)
INSERT INTO farmers (full_name, phone, national_id, cooperative_member, pin_hash)
VALUES (
  'Demo Çiftçi',
  '+905001234567',
  NULL,
  TRUE,
  '$2b$10$vUaA/HB8SRgI2H2h6cyhOOgmBklhRoK63zazUuMCjPNLivmxg0TN6'
)
ON CONFLICT (phone) DO NOTHING;

INSERT INTO contracts (farmer_id, buyer_name, product_type, quantity_kg, price_per_kg, total_value_tl)
VALUES
  (
    (SELECT id FROM farmers WHERE phone = '+905001234567'),
    'Ankara Taze Market', 'Buğda', 5000, 8.50, 42500.00
  ),
  (
    (SELECT id FROM farmers WHERE phone = '+905001234567'),
    'EgeEx İhracat A.Ş.', 'Nohut', 2000, 12.00, 24000.00
  );
