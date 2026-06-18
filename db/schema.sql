CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE farmers (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name          VARCHAR(255) NOT NULL,
    phone              VARCHAR(20)  UNIQUE NOT NULL,
    national_id        VARCHAR(20),
    cooperative_member BOOLEAN      DEFAULT FALSE,
    pin_hash           VARCHAR(60)  DEFAULT NULL,
    created_at         TIMESTAMPTZ  DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE parcels (
    id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id    UUID           NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    parcel_code  VARCHAR(50),
    land_size_ha DECIMAL(10,4)  NOT NULL,
    geometry     GEOMETRY(POLYGON, 4326),
    region       VARCHAR(100),
    -- CLAUDE.md: OCR nəticəsi "ocr_extracted" olaraq qalır, "verified" deyil
    cks_source   VARCHAR(20)    DEFAULT 'ocr_extracted',
    created_at   TIMESTAMPTZ    DEFAULT NOW()
);
CREATE INDEX parcels_geometry_idx  ON parcels USING GIST (geometry);
CREATE INDEX parcels_farmer_id_idx ON parcels (farmer_id);

-- CLAUDE.md: contracts heç vaxt pul köçürməsi saxlamır (BDDK tənzimləyici sərhədi)
CREATE TABLE contracts (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id      UUID          NOT NULL REFERENCES farmers(id),
    buyer_name     VARCHAR(255)  NOT NULL,
    product_type   VARCHAR(100),
    quantity_kg    DECIMAL(10,2),
    price_per_kg   DECIMAL(10,4),
    total_value_tl DECIMAL(14,2),
    status         VARCHAR(20)   DEFAULT 'draft'
                   CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    signed_at      TIMESTAMPTZ,
    created_at     TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE credit_scores (
    id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id             UUID          NOT NULL REFERENCES farmers(id),
    score                 INTEGER       NOT NULL CHECK (score BETWEEN 0 AND 1000),
    repayment_probability DECIMAL(5,4),
    risk_band             VARCHAR(10)   NOT NULL,
    credit_limit_tl       DECIMAL(14,2),
    model_version         VARCHAR(50)   NOT NULL,
    data_note             TEXT,
    input_snapshot        JSONB,
    feature_contributions JSONB,
    created_at            TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX credit_scores_farmer_id_idx ON credit_scores (farmer_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER farmers_updated_at
BEFORE UPDATE ON farmers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
