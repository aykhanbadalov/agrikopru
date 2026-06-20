# AgriKöprü

**Agricultural Credit Scoring Platform — TEKNOFEST Tarım Teknolojileri**

AgriKöprü enables smallholder farmers without credit history or real-estate collateral to obtain a credit score using alternative data sources: ÇKS land registry records, TARSİM insurance behavior, and farming history. The platform scores farmers and matches them with B2B pre-sale contracts and bank partners. It does not hold or transfer funds.

Two access channels:
- **USSD** (`*123#`) — for farmers without smartphones, works on any keypad phone
- **Mobile app** — for B2B buyers, cooperative representatives, and tech-savvy farmers

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  apps/mobile-dashboard   React Native (Expo SDK ~56) │
│  services/ussd-simulator  HTML/JS web widget         │
└───────────────────┬─────────────────────────────────┘
                    │ HTTP
          ┌─────────▼──────────┐
          │  services/backend  │  Node.js + Express  :4000
          │  (orchestration)   │
          └─────────┬──────────┘
                    │ HTTP
     ┌──────────────▼──────────────┐
     │  services/scoring-engine    │  Python + FastAPI  :8001
     │  XGBoost scoring + OCR      │
     └──────────────┬──────────────┘
                    │
          ┌─────────▼──────────┐
          │  PostgreSQL+PostGIS │  :5432  db: agrikopru
          └────────────────────┘
```

Government APIs (ÇKS, TARSİM, bank) are not publicly accessible. All integrations are simulated by `MOCK_`-prefixed functions and clearly labeled as such throughout the codebase.

---

## Services

### 1. Database

PostgreSQL with PostGIS extension (required for parcel geometry).

```bash
# Start with Docker
docker run -d \
  --name agrikopru-db \
  -e POSTGRES_DB=agrikopru \
  -e POSTGRES_USER=agrikopru \
  -e POSTGRES_PASSWORD=agrikopru_dev \
  -p 5432:5432 \
  postgis/postgis:15-3.3

# Apply schema and seed data
psql -U agrikopru -d agrikopru -f db/schema.sql
psql -U agrikopru -d agrikopru -f db/seed_demo.sql
```

If upgrading an existing database, apply the migration:

```bash
psql -U agrikopru -d agrikopru -f db/migration_001_farmer_profile.sql
psql -U agrikopru -d agrikopru -f db/seed_update.sql
```

### 2. Scoring Engine

Python 3.9+, FastAPI, XGBoost. Includes the OCR pipeline.

```bash
cd services/scoring-engine
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Train the model (generates model/agrikopru_model.pkl)
python -m training.train

# Start the API
uvicorn api.main:app --port 8001 --reload
```

**Endpoints:**
- `POST /score` — compute credit score
- `POST /ocr/extract-cks` — extract land size from a ÇKS document image
- `GET /health`

> **Note:** The model is trained on a synthetic dataset. All outputs are clearly labeled `SENTETİK MODEL V1` in the UI and must never be presented as real creditworthiness assessments.

### 3. Backend

Node.js 20+, Express.

```bash
cd services/backend
cp .env.example .env   # edit DB credentials and SCORING_ENGINE_URL if needed
npm install
npm run dev            # or: npm start
```

Default port: **4000**

**.env variables:**
```
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agrikopru
DB_USER=agrikopru
DB_PASSWORD=agrikopru_dev
SCORING_ENGINE_URL=http://localhost:8001
```

**Key routes:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/farmers` | List farmers (supports `?phone=` filter) |
| GET | `/api/farmers/:id` | Farmer detail |
| PUT | `/api/farmers/:id` | Update farmer profile / land size |
| GET | `/api/farmers/:id/score-history` | Score history |
| POST | `/api/score` | Trigger scoring (proxies to scoring engine) |
| GET/POST | `/api/contracts` | List / create contracts |
| POST | `/api/contracts/:id/confirm` | PIN confirmation (rate-limited: 3 attempts, 15-min lockout) |
| POST | `/api/ocr/extract-cks` | ÇKS document OCR (proxies to scoring engine) |

### 4. USSD Simulator

A browser widget that simulates the `*123#` keypad-phone experience.

```bash
# No build step needed — open directly in a browser
open services/ussd-simulator/index.html
```

Configure the backend URL in `services/ussd-simulator/config.js` (default: `http://localhost:4000`).

### 5. Mobile Dashboard

React Native with Expo SDK ~56. Requires Node.js 18+ and Expo CLI.

```bash
cd apps/mobile-dashboard
npm install --legacy-peer-deps
npx expo start
```

Scan the QR code with **Expo Go** (iOS/Android).

Set the backend URL in `apps/mobile-dashboard/constants/config.ts`. For a device on the same LAN, use your machine's local IP (e.g., `http://192.168.x.x:4000`).

**B2B flow** (buyer/cooperative role):
- Ana Panel → farmer list
- Kredi Analizi → score card, SHAP factor breakdown, score history chart, ÇKS document upload
- Sözleşme Teklifi → create pre-sale contracts
- Aktif Portföy → active contract overview

**Farmer flow** (çiftçi role):
- Login with phone number
- Panelim → own score card
- Sözleşmelerim → incoming contract offers, PIN-based confirmation
- Hesabım → profile, ÇKS document upload, role switch

---

## Credit Score Model

Scores range from **0 to 1000** across six features:

| Feature | Weight |
|---------|--------|
| Land size (ÇKS) | 15% |
| Farming history (years) | 20% |
| Cooperative membership | 15% |
| TARSİM insurance history | 20% |
| Fertilizer purchases | 15% |
| Climate risk (negative) | 15% |

**Credit limit formula:**

```
credit_limit_TL = score × land_size_ha × regional_crop_profitability_index
```

The base coefficient (TL/ha) is configurable in `services/scoring-engine/config.py` and has not been finalized by the business team.

---

## Key Constraints

- **No fund transfer.** AgriKöprü only scores and matches. Never add money movement logic.
- **Synthetic data.** The XGBoost model is trained on generated data. Label all outputs as synthetic — never present them as real credit assessments.
- **Mock services.** Every simulated government API must use the `MOCK_` prefix. Never mix mock and real data sources in the same function.
- **OCR trust boundary.** Document extraction results carry `source: "ocr_extracted"` — never `"verified"`.

---

## Project Structure

```
agrikopru/
├── CLAUDE.md                    # AI assistant context (session memory)
├── db/
│   ├── schema.sql
│   ├── migration_001_farmer_profile.sql
│   ├── seed_demo.sql
│   └── seed_update.sql
├── services/
│   ├── scoring-engine/          # Python · FastAPI · XGBoost · Tesseract + OpenCV
│   │   ├── api/
│   │   ├── data/                # Synthetic dataset generator
│   │   ├── training/
│   │   ├── ocr/
│   │   └── config.py
│   ├── backend/                 # Node.js · Express
│   │   └── src/routes/          # farmers, contracts, score, ocr, health
│   └── ussd-simulator/          # Static HTML/JS
└── apps/
    └── mobile-dashboard/        # React Native · Expo SDK ~56
        ├── app/
        │   ├── (tabs)/          # B2B tab bar
        │   └── farmer/
        │       ├── (tabs)/      # Farmer tab bar
        │       ├── login.tsx
        │       └── confirm.tsx
        ├── components/
        └── services/api.ts
```
