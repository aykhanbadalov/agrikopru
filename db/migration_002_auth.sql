-- Migration 002: Qeydiyyat / Login sistemi üçün şifrə sahələri

ALTER TABLE farmers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(60) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS buyers (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name  VARCHAR(255) NOT NULL,
    phone         VARCHAR(20)  UNIQUE NOT NULL,
    password_hash VARCHAR(60)  NOT NULL,
    created_at    TIMESTAMPTZ  DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Demo çiftçilər üçün default şifrə "1234"
-- Hash: bcrypt cost 10, node -e "require('bcryptjs').hash('1234',10).then(console.log)"
UPDATE farmers
SET password_hash = '$2b$10$R6YhSUNxXlZWUOBcg1xNUe5ic.RDgcuh8vGNKNcPZezlBBLVo0JLe'
WHERE phone IN ('+905001234567', '+905001111111', '+905002222222');
