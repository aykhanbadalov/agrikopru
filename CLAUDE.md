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
Fayl saxlama   | Supabase Storage                | CKS sənədləri `cks-documents` bucket-ında saxlanır

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

Kredi limiti = (skor / 1000) × arazi_ha × bölgəsel_kârlılıq_endeksi × 75.000 TL/ha
Bölgəsel kârlılıq endeksi V1-də 1.0 (sabit). Bazə əmsalı (75.000 TL/ha)
config.py-da konfiqurasiya edilə bilən dəyərdir.

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
  Auth routes (/api/auth/):
    - POST /register    multipart/form-data; farmer üçün cks_document faylı qəbul edir;
                        Supabase Storage-a yükləyir (bucket: cks-documents, upsert: true)
    - POST /login       phone + password; farmer və ya buyer cədvəlini yoxlayır
    - POST /verify-registration  OTP kodu ilə telefonu təsdiqlər; istifadəçi məlumatını qaytarır
    - POST /resend-otp  mövcud istifadəçiyə yeni OTP göndərir (register purpose)
    - POST /change-password  köhnə şifrə yoxlaması ilə şifrə yeniləmə
  Digər routes:
    - GET/PUT /api/farmers, GET /api/farmers/:id/score-history
    - POST /api/score: farmer profil faktorlarını DB-dən oxuyur, body dəyərləri üstün gəlir
    - POST /api/contracts/:id/confirm: OTP doğrulaması
      - 3 yanlış cəhd → 15 dəq in-memory lockout, 429 + lockedUntil
    - POST /api/ocr: scoring-engine OCR-a proxy, multer memoryStorage
    - PUT /api/farmers/:id: land_size_ha → parcels cədvəlinə upsert

OTP sistemi (services/backend/src/otp.js)
  - In-memory Map, açar: `${purpose}:${identifier}`
  - TTL: 5 dəqiqə, maksimum 3 cəhd, 15 dəq lockout
  - Purposes: "register" (auth), "confirm" (müqavilə təsdiqi), "create" (B2B müqavilə)
  - Server restart-da sıfırlanır → V2-də DB-backed lazımdır

DB (db/)
  - schema.sql: farmers, parcels, contracts, credit_scores cədvəlləri
  - farmers cədvəlindəki profil sütunları:
    cooperative_member, farming_history_years, tarsim_history_score (0–1 aralığında!),
    fertilizer_purchases, climate_risk_score, national_id, cks_document_path,
    phone_verified, password_hash
  - migration_001_farmer_profile.sql: profil sütunlarını əlavə edir
  - seed_demo.sql + seed_update.sql: demo çiftçi datası
  - DİQQƏT: tarsim_history_score DB-də 0–1 saxlanır. UI-da 0–100 göstərilir,
    submit zamanı 100-ə bölünür (register-farmer.tsx).

USSD simulyatoru (services/ussd-simulator/)
  - Veb widget: *123# axını, PIN təsdiqi, backend inteqrasiyası
  - Tamamilə test edilib

Mobil tətbiq (apps/mobile-dashboard/) — Expo SDK ~56, expo-router ~56
  Auth axını: app/auth/
    - start.tsx     (giriş/qeydiyyat seçimi, logo göstərilir)
    - login.tsx     (telefon + şifrə)
    - register-farmer.tsx  (ÇKS yükləmə + profil formu; multipart submit)
    - register-buyer.tsx   (şirkət adı + telefon + şifrə)
    - verify-otp.tsx  (6 xanəli OTP; DemoOtpBanner + OtpDigitInput + "Yeni kod gönder")
  B2B axını: app/(tabs)/
    - index (Ana Panel — çiftçi siyahısı)
    - credit (Kredi Analizi — skor kartı, SHAP faktörləri, skor tarixçəsi chart)
      NOT: ÇKS yükləmə B2B ekranında YOXdur — yalnız çiftçi qeydiyyatında var
    - contract (Sözleşmə Teklifi — OTP ilə yaradılır)
    - portfolio (Aktif Portföy)
  Çiftçi axını: app/farmer/
    - login.tsx (telefon + şifrə → AsyncStorage-ə farmer yaz → tab bar-a keç)
    - (tabs)/panelim.tsx  (skor kartı; mount-da latest_score null-sa POST /api/score çağırır)
    - (tabs)/sozlesmelerim.tsx (sözleşmə siyahısı; useFocusEffect ilə hər focus-da yenilənir)
    - (tabs)/hesabim.tsx (ad/tel, Rolü Değiştir)
    - confirm.tsx (OTP ilə müqavilə təsdiqi, stack-da)
  Komponentlər:
    - ScoreBadge, ContractStatusBadge, FarmerCard
    - OtpDigitInput  — 6 kvadrat qutu; invisible TextInput overlay
      (color:'transparent' + caretHidden; opacity:0 iOS klaviaturasını öldürür)
    - DemoOtpBanner  — iOS bildiriş üslubunda animasiyalı banner; position:'absolute',
      ScrollView xaricində sibling kimi yerləşdirilir; useSafeAreaInsets ilə
    - ScoreChart     — SVG əsaslı skor tarixçəsi qrafiki
    - ShapBar        — SHAP feature contribution bar chart
  Çiftçi veri paylaşımı: AsyncStorage key "currentFarmer"

Bilinən risklər / açıq suallar

Təlim datası yoxdur — XGBoost çəkiləri sintetik label ilə öyrədilir,
real default tarixçəsi yoxdur. V1 üçün qəbul edilib, UI-da açıq qeyd var.

Tənzimləyici sərhəd — AgriKöprü HEÇ VAXT fond saxlamır/ötürmür —
yalnız skorlayır və uyğunlaşdırır. Kodda "pul köçürmə" funksiyası yazma.

OCR fırıldaq riski — saxta ÇKS sənədi yüklənə bilər. Nəticə həmişə
ocr_extracted etiketiylə göstərilir, heç vaxt "doğrulanmış" kimi qeyd olunmur.

OTP/PIN lockout in-memory saxlanır (Map) — server restart-da sıfırlanır.
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
        routes/            # farmers.js, contracts.js, score.js, ocr.js, health.js, auth.js
        db.js
        otp.js             # in-memory OTP sistemi
        supabase.js        # Supabase Storage client
        app.js
      server.js
    ussd-simulator/        # index.html, ussd.js, style.css, config.js
  apps/
    mobile-dashboard/      # React Native (Expo)
      app/
        auth/              # start, login, register-farmer, register-buyer, verify-otp
        (tabs)/            # B2B tab bar
        farmer/            # Çiftçi axını
          (tabs)/          # panelim, sozlesmelerim, hesabim
          login.tsx
          confirm.tsx
      components/          # ScoreBadge, ContractStatusBadge, FarmerCard,
                           # OtpDigitInput, DemoOtpBanner, ScoreChart, ShapBar
      services/api.ts
      constants/config.ts

Konvensiyalar

Kod identifikatorları İngilis dilində, domen şərhləri Azərbaycan/Türk dilində ola bilər.
Hər mock servis funksiyası/faylı MOCK_ və ya mock_ prefiksi ilə açıq işarələnməlidir.
Yeni asılılıq əlavə etməzdən əvvəl niyə lazım olduğunu bir cümləylə qeyd et.
Expo-da native paket qurarkən --legacy-peer-deps lazımdır; expo-linking-i
  həmişə explicit dependency kimi saxla (expo install ilə itə bilər).
Bütün istifadəçiyə görünən mətn standart Türkiye Türkçesi ilə yazılmalıdır.
