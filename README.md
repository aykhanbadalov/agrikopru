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
          └──────┬──────┬──────┘
                 │      │ HTTP
                 │   ┌──▼──────────────────────────┐
                 │   │  services/scoring-engine     │  Python + FastAPI  :8001
                 │   │  XGBoost scoring + OCR       │
                 │   └─────────────────────────────┘
          ┌──────▼─────────────┐
          │  PostgreSQL+PostGIS │  Supabase (remote)
          └────────────────────┘
```

Government APIs (ÇKS, TARSİM, bank) are not publicly accessible. All integrations are simulated by `MOCK_`-prefixed functions and clearly labeled as such throughout the codebase.

---

## Services

### 1. Database

PostgreSQL (Supabase) with PostGIS extension for parcel geometry. CKS documents are stored in Supabase Storage (`cks-documents` bucket).

For local development with Docker:

```bash
docker run -d \
  --name agrikopru-db \
  -e POSTGRES_DB=agrikopru \
  -e POSTGRES_USER=agrikopru \
  -e POSTGRES_PASSWORD=agrikopru_dev \
  -p 5432:5432 \
  postgis/postgis:15-3.3

psql -U agrikopru -d agrikopru -f db/schema.sql
psql -U agrikopru -d agrikopru -f db/migration_001_farmer_profile.sql
psql -U agrikopru -d agrikopru -f db/seed_demo.sql
psql -U agrikopru -d agrikopru -f db/seed_update.sql
```

### 2. Scoring Engine

Python 3.9+, FastAPI, XGBoost. Includes the OCR pipeline.

```bash
cd services/scoring-engine
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Train the model
python training/train.py

# Start the API
uvicorn api.main:app --port 8001 --reload
```

**Endpoints:**
- `POST /score` — compute credit score
- `POST /ocr/extract-cks` — extract land size and farmer info from a ÇKS document image
- `GET /health`

> **Note:** The model is trained on a synthetic dataset (AUC 0.9102). All outputs are labeled `SENTETİK MODEL V1` in the UI and must never be presented as real creditworthiness assessments.

### 3. Backend

Node.js 20+, Express.

```bash
cd services/backend
cp .env.example .env   # edit DB credentials, Supabase keys, and SCORING_ENGINE_URL
npm install
npm run dev
```

Default port: **4000**

**.env variables:**
```
PORT=4000
DB_HOST=...
DB_PORT=5432
DB_NAME=postgres
DB_USER=...
DB_PASSWORD=...
SCORING_ENGINE_URL=http://localhost:8001
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
```

**Key routes:**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register farmer (multipart, includes ÇKS file) or buyer |
| POST | `/api/auth/login` | Login with phone + password |
| POST | `/api/auth/verify-registration` | Verify phone with OTP code |
| POST | `/api/auth/resend-otp` | Resend OTP to existing user |
| POST | `/api/auth/change-password` | Change password (requires old password) |
| GET | `/api/farmers` | List farmers (supports `?phone=` filter) |
| GET | `/api/farmers/:id` | Farmer detail with latest score |
| PUT | `/api/farmers/:id` | Update farmer profile / land size |
| GET | `/api/farmers/:id/score-history` | Score history |
| POST | `/api/score` | Trigger scoring (proxies to scoring engine) |
| GET/POST | `/api/contracts` | List / create contracts |
| POST | `/api/contracts/:id/confirm` | OTP-based contract confirmation (3 attempts, 15-min lockout) |
| POST | `/api/ocr/extract-cks` | ÇKS document OCR (proxies to scoring engine) |

OTP codes are stored in-memory (5-min TTL, 3 attempts, 15-min lockout after failure). They reset on server restart — a persistent store is needed for production.

### 4. USSD Simulator

A browser widget that simulates the `*123#` keypad-phone experience.

```bash
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

**Auth flow** (both roles):
- Start screen → Login or Register
- Farmer registration: upload ÇKS document (camera / gallery / file picker), fill profile form, OTP verification
- Buyer registration: company name + phone + password, OTP verification
- OTP screen shows an animated demo banner with the code (no real SMS)

**B2B flow** (buyer/cooperative role):
- Ana Panel → farmer list
- Kredi Analizi → score card, SHAP factor breakdown, score history chart
- Sözleşme Teklifi → create pre-sale contracts (OTP-confirmed)
- Aktif Portföy → active contract overview

**Farmer flow** (çiftçi role):
- Login with phone + password
- Panelim → own score card (auto-calculates score on first load if missing)
- Sözleşmelerim → incoming contract offers, OTP-based confirmation; refreshes on every navigation focus
- Hesabım → profile info, role switch

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
credit_limit_TL = (score / 1000) × land_size_ha × regional_profitability_index × 75,000 TL/ha
```

The regional profitability index defaults to 1.0. The base coefficient (75,000 TL/ha) is configurable in `services/scoring-engine/config.py`.

> `tarsim_history_score` is stored in the database as a value between 0 and 1. The registration form accepts 0–100 and divides by 100 before submission.

---

## Key Constraints

- **No fund transfer.** AgriKöprü only scores and matches. Never add money movement logic.
- **Synthetic data.** The XGBoost model is trained on generated data. Label all outputs as synthetic — never present them as real credit assessments.
- **Mock services.** Every simulated government API must use the `MOCK_` prefix. Never mix mock and real data sources in the same function.
- **OCR trust boundary.** Document extraction results carry `source: "ocr_extracted"` — never `"verified"`.
- **ÇKS upload** is available only during farmer registration, not in the B2B credit analysis screen.

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
│   │   └── src/
│   │       ├── routes/          # farmers, contracts, score, ocr, health, auth
│   │       ├── otp.js           # In-memory OTP store
│   │       └── supabase.js      # Supabase Storage client
│   └── ussd-simulator/          # Static HTML/JS
└── apps/
    └── mobile-dashboard/        # React Native · Expo SDK ~56
        ├── app/
        │   ├── auth/            # start, login, register-farmer, register-buyer, verify-otp
        │   ├── (tabs)/          # B2B tab bar
        │   └── farmer/
        │       ├── (tabs)/      # panelim, sozlesmelerim, hesabim
        │       ├── login.tsx
        │       └── confirm.tsx
        ├── components/          # ScoreBadge, ContractStatusBadge, FarmerCard,
        │                        # OtpDigitInput, DemoOtpBanner, ScoreChart, ShapBar
        ├── services/api.ts
        └── constants/config.ts
```
