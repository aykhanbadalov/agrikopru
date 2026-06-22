-- Demo çiftçilər üçün PIN "1234" bcrypt hash-i
-- Hash: node -e "require('bcryptjs').hash('1234',10).then(console.log)"
-- Yalnız Demo Çiftçi, Mehmet Yılmaz, Ayşe Kaya hesablarına tətbiq edilir

UPDATE farmers
SET pin_hash = '$2b$10$/6c7GaO3EIBqHtZ8FXLfwe2a6/B1WcL5NjHsrS9XU940CDQ4wEaIG'
WHERE phone IN ('+905001234567', '+905001111111', '+905002222222');
