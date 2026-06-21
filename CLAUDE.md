# CLAUDE.md
AgriKöprü — layihə konteksti

Bu fayl Claude Code-un hər sessiyada oxuduğu layihə yaddaşıdır. TEKNOFEST
Tarım Teknolojileri Yarışması üçün hazırlanan "AgriKöprü" layihəsinin
işləyən prototipidir.

Layihə nədir

AgriKöprü, kredi sicili/gayrimenkul girovu olmayan kiçik çiftçilərin
ÇKS (arazi qeydi), TARSİM (sığorta davranışı) və əkin tarixçəsi kimi
alternativ məlumatlarla kredit skoru almasını təmin edən bir
tarımsal fintech platformasıdır. İki giriş kanalı var: smartfonu/internet
olmayan çiftçilər üçün USSD (*123#, tuşlu telefon), və B2B alıcılar
(market/ixracatçı), kooperativ təmsilçiləri, gənc çiftçilər üçün
müasir app. Sistem pul vermir — skorlayır və B2B ön-satış müqavilələri
ilə banklara/alıcılara uyğunlaşdırır.

Texnoloji qərarlar (qəti — dəyişdirmədən əvvəl müzakirə et)

Qat            | Texnologiya                     | Səbəb
Skor mühərriki | Python + XGBoost, FastAPI       | Backend-dən ayrı, müstəqil təlim/deploy
Backend        | Node.js + Express               | Orkestrasiya qatı
DB             | PostgreSQL + PostGIS            | Arazi/parsel poligonları üçün geodata
OCR            | Python + Tesseract + OpenCV     | scoring-engine/ocr/ altında; ayrıca servis deyil
USSD           | Veb-əsaslı simulyator           | Real telco inteqrasiyası lazımsız; HTML widget
Mobil tətbiq   | React Native (Expo SDK ~56)     | Expo Go ilə sürətli test; həm B2B həm çiftçi axını

Hökumət API-ları (ÇKS, TARSİM, bank) real əlçatan deyil → bunlar açıq
şəkildə MOCK_ prefiksli servis/funksiyalarla simulyasiya olunmalıdır,
ki Faz 2-də real inteqrasiya ilə əvəzlənməsi asan olsun. Heç vaxt mock
və real data mənbəyini eyni funksiya daxilində qarışdırma.

Skor formulası (hesabatın 3.1 bölməsi — bunu dəyişmə, yalnız müzakirə ilə)

0–1000 aralığında skor, 6 göstərici üzərindən:

Göstərici                | Çəki
Arazi böyüklüyü (ÇKS)   | 15%
Əkin tarixçəsi           | 20%
Kooperativ üzvlüyü       | 15%
TARSİM tarixçəsi         | 20%
Gübrə alımı              | 15%
İqlim riski (mənfi təsir)| 15%

Kredi limiti = skor × ÇKS arazi böyüklüyü × Bölgəsel Ürün Kârlılık
Endeksi. Bazə əmsalı (TL/ha) konfiqurasiya edilə bilən dəyərdir
(config.py-da sabit deyil).

XGBoost-u real default/geri-ödəmə tarixçəsi olmadan təlim edə bilmərik.
V1-də sintetik+qaydabazlı dataset istifadə olunur. Bu HƏR YERDƏ açıq
şəkildə "sintetik" kimi qeyd olunmalıdır — real data kimi təqdim etmə.

Tamamlanmış komponentlər

Skor mühərriki (services/scoring-engine/)
  - Sintetik data generatoru (data/generate_dataset.py)
  - XGBoost təlim skripti (training/train.py)
    Komanda tərəfindən yenidən quruldu: ayrıca validation dəsti ilə test sızması
    aradan qaldırıldı, scale_pos_weight ilə sinif balansı idarə olunur.
    Son AUC: 0.9102. Bu səbəbdən Demo Çiftçi skoru 844 (LOW) → 648 (MEDIUM)
    dəyişib — gözlənilən və sağlam dəyişiklikdir, bug deyil.
  - FastAPI: POST /score, GET /health
  - OCR modulu: POST /ocr/extract-cks
    - Tesseract + OpenCV cədvəl aşkarlaması
    - Magic bytes MIME yoxlaması (JPEG/PNG/WebP/PDF)
    - Nəticə həmişə source: "ocr_extracted" (heç vaxt "verified" deyil)

Backend (services/backend/)
  - Express routes: /api/farmers, /api/contracts, /api/score, /api/ocr, /api/health
  - POST /api/score: farmer profil faktorlarını DB-dən oxuyur, body dəyərləri üstün gəlir
  - GET /api/farmers/:id/score-history: skor tarixçəsi
  - POST /api/contracts/:id/confirm: PIN doğrulaması
    - 3 yanlış cəhd → 15 dəq in-memory lockout, 429 + lockedUntil
  - POST /api/ocr: scoring-engine OCR-a proxy, multer memoryStorage
  - PUT /api/farmers/:id: land_size_ha → parcels cədvəlinə upsert

DB (db/)
  - schema.sql: farmers, parcels, contracts, scores cədvəlləri
  - farmers cədvəlindəki profil sütunları:
    cooperative_member, farming_history_years, tarsim_history_score,
    fertilizer_purchases, climate_risk_score
  - migration_001_farmer_profile.sql: son 4 sütunu əlavə edir
  - seed_demo.sql + seed_update.sql: demo çiftçi datası

USSD simulyatoru (services/ussd-simulator/)
  - Veb widget: *123# axını, PIN təsdiqi, backend inteqrasiyası
  - Tamamilə test edilib

Mobil tətbiq (apps/mobile-dashboard/) — Expo SDK ~56, expo-router ~56
  B2B axını: app/(tabs)/
    - index (Ana Panel — çiftçi siyahısı)
    - credit (Kredi Analizi — skor kartı, SHAP faktörləri, skor tarixçəsi SVG chart, ÇKS yükləmə)
    - contract (Sözleşmə Teklifi)
    - portfolio (Aktif Portföy)
  Çiftçi axını: app/farmer/
    - login.tsx (telefon girişi → AsyncStorage-ə farmer yaz → tab bar-a keç)
    - (tabs)/panelim.tsx (skor kartı)
    - (tabs)/sozlesmelerim.tsx (sözleşmə siyahısı)
    - (tabs)/hesabim.tsx (ad/tel, ÇKS yükləmə, Rolü Değiştir)
    - confirm.tsx (PIN girişi, stack-da)
  Komponentlər: ScoreBadge, ContractStatusBadge, FarmerCard
  Çiftçi veri paylaşımı: AsyncStorage key "currentFarmer" (userRole pattern-inə uyğun)

Bilinən risklər / açıq suallar

Təlim datası yoxdur — XGBoost çəkiləri sintetik label ilə öyrədilir,
real default tarixçəsi yoxdur. V1 üçün qəbul edilib, UI-da açıq qeyd var.

Tənzimləyici sərhəd — AgriKöprü HEÇ VAXT fond saxlamır/ötürmür —
yalnız skorlayır və uyğunlaşdırır. Kodda "pul köçürmə" funksiyası yazma.

OCR fırıldaq riski — saxta ÇKS sənədi yüklənə bilər. Nəticə həmişə
ocr_extracted etiketiylə göstərilir, heç vaxt "doğrulanmış" kimi qeyd olunmur.

PIN lockout in-memory saxlanır (Map) — server restart-da sıfırlanır.
V2-də DB-backed lockout lazımdır.

USSD üzərindən maliyyə əməliyyatları üçün autentifikasiya dizayn edilməyib.

Qovluq strukturu

agrikopru/
  CLAUDE.md
  docker-compose.yml
  db/
    schema.sql
    migration_001_farmer_profile.sql
    seed_demo.sql
    seed_update.sql
  services/
    scoring-engine/        # Python + FastAPI + XGBoost + OCR
      api/                 # main.py, scorer.py, schemas.py
      data/                # generate_dataset.py
      training/            # train.py
      ocr/                 # extractor.py, schemas.py
      config.py
      requirements.txt
    backend/               # Node.js + Express
      src/
        routes/            # farmers.js, contracts.js, score.js, ocr.js, health.js
        db.js
        app.js
      server.js
    ussd-simulator/        # index.html, ussd.js, style.css, config.js
  apps/
    mobile-dashboard/      # React Native (Expo)
      app/
        (tabs)/            # B2B tab bar
        farmer/            # Çiftçi axını
          (tabs)/          # Çiftçi tab bar
          login.tsx
          confirm.tsx
      components/
      services/api.ts
      constants/config.ts

Konvensiyalar

Kod identifikatorları İngilis dilində, domen şərhləri Azərbaycan/Türk dilində ola bilər.
Hər mock servis funksiyası/faylı MOCK_ və ya mock_ prefiksi ilə açıq işarələnməlidir.
Yeni asılılıq əlavə etməzdən əvvəl niyə lazım olduğunu bir cümləylə qeyd et.
Expo-da native paket qurarkən --legacy-peer-deps lazımdır; expo-linking-i
  həmişə explicit dependency kimi saxla (expo install ilə itə bilər).
Bütün istifadəçiyə görünən mətn standart Türkiye Türkçesi ilə yazılmalıdır.
