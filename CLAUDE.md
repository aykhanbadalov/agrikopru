# CLAUDE.md
AgriKöprü — layihə konteksti

Bu fayl Claude Code-un hər sessiyada oxuduğu layihə yaddaşıdır. TEKNOFEST
Tarım Teknolojileri Yarışması üçün hazırlanan "AgriKöprü" layihəsinin
final mərhələsi üçün işləyən prototipini bu qovluqda sıfırdan quracağıq.

Layihə nədir

AgriKöprü, kredi sicili/gayrimenkul girovu olmayan kiçik çiftçilərin
ÇKS (arazi qeydi), TARSİM (sığorta davranışı) və əkin tarixçəsi kimi
alternativ məlumatlarla kredit skoru almasını təmin edən bir
tarımsal fintech platformasıdır. İki giriş kanalı var: smartfonu/internet
olmayan çiftçilər üçün USSD (*123#, tuşlu telefon), və B2B alıcılar
(market/ixracatçı), kooperativ təmsilçiləri, gənc çiftçilər üçün
müasir app. Sistem pul vermir — skorlayır və B2B ön-satış müqavilələri
ilə banklara/alıcılara uyğunlaşdırır.

Tam hesabat: bax docs/teknofest-rapor-ozeti.md (əlavə ediləcək).

Texnoloji qərarlar (qəti — dəyişdirmədən əvvəl müzakirə et)

QatTexnologiyaSəbəbSkor mühərrikiPython + XGBoost, FastAPI mikroservisBackend-dən ayrı, müstəqil təlim/deploy oluna bilsinBackendNode.js + ExpressHesabatda belə qeyd olunub, orkestrasiya qatıDBPostgreSQL + PostGISArazi/parsel poligonları üçün geodata lazımdırOCR (Faz 1)Python + TesseractÇKS sənədini foto ilə oxumaq — real API yoxdursa fallbackUSSDVeb-əsaslı simulyator (Kannel YOX)Real telco/SMSC inteqrasiyası demo üçün lazımsız ağırlıqdır; tuş-telefon ekranını imitasiya edən sadə bir widget kifayətdirMobil tətbiq (B2B dashboard)React Native (Expo)Hesabatda "(App)" kimi adlandırılıb, mockup ekranlar telefon formatındadır, komanda cədvəlində "Mobil Geliştirme" rolu var — əsl mobil tətbiq olmalıdır; Expo seçildi (JS/React bilik bazası saxlanılır, Expo Go ilə sürətli test)

Hökumət API-ları (ÇKS, TARSİM, bank) real əlçatan deyil → bunlar açıq
şəkildə MOCK_ prefiksli servis/funksiyalarla simulyasiya olunmalıdır,
ki Faz 2-də real inteqrasiya ilə əvəzlənməsi asan olsun. Heç vaxt mock
və real data mənbəyini eyni funksiya daxilində qarışdırma.

Skor formulası (hesabatın 3.1 bölməsi — bunu dəyişmə, yalnız müzakirə ilə)

0–1000 aralığında skor, 6 göstərici üzərindən:

GöstəriciÇəkiArazi böyüklüyü (ÇKS)15%Əkin tarixçəsi20%Kooperativ üzvlüyü15%TARSİM tarixçəsi20%Gübrə alımı15%İklim riski (mənfi təsir)15%

Kredi limiti = skor × ÇKS arazi böyüklüyü × Bölgəsel Ürün Kârlılık
Endeksi. Bazə əmsalı (TL/ha) hələ biznes tərəfdən təsdiqlənməyib —
bunu sabit deyil, konfiqurasiya edilə bilən dəyər kimi saxla.

XGBoost-u real default/geri-ödəmə tarixçəsi olmadan təlim edə bilmərik
(bax Risk #1). V1-də sintetik+qaydabazlı dataset istifadə olunur, bu
HƏR YERDƏ açıq şəkildə "sintetik" kimi qeyd olunmalıdır — jüriyə və ya
istənilən oxuyana real data kimi təqdim edilməməlidir.

Tikinti prioritet sırası


Skor mühərriki — sintetik data generator + XGBoost təlim skripti

FastAPI /score endpoint. Ən tez nümayiş oluna bilən hissə.



Backend + DB — Çiftçi, Arazi (PostGIS), Sözləşmə, Skor modelləri;
skor mühərrikinə proxy.
USSD axın simulyatoru — layihənin əsas fərqləndirici hekayəsi
(smartfonsuz əlçatanlıq), bunu canlı göstərə bilmək kritikdir.
(tamamlandı, test edildi — USSD axını, PIN təsdiqi və backend
inteqrasiyası real olaraq sınanıb)
B2B dashboard — mockup ekranların Expo/React Native ilə real mobil tətbiqə çevrilməsi.
OCR pipeline — ÇKS foto → veri çıxarma. Gözəl əlavə, kritik deyil.


Bu sıra ilə işlə, sıranı dəyişmək istəsən əvvəl niyə soruş.

Bilinən risklər / açıq suallar (hesabatda həll edilməyib)


Təlim datası yoxdur — XGBoost çəkiləri hesabatda sabit faiz kimi
yazılıb, real default tarixçəsi olmadan "öyrədilmiş" model demək
texniki cəhətdən düzgün deyil. V1: sintetik label + açıq qeyd.
Tənzimləyici sərhəd — Türkiyədə kredi vermə BDDK nəzarətindədir.
AgriKöprü HEÇ VAXT fond saxlamır/ötürmür — yalnız skorlayır və
uyğunlaşdırır, kreditverən bank/partnyordur. Kodda bu sərhədi poza
biləcək heç bir "pul köçürmə" funksiyası yazma.
OCR fırıldaq riski — saxta/dəyişdirilmiş ÇKS sənədi yüklənə bilər.
V1 üçün problem deyil, amma OCR nəticəsini "doğrulanmış" kimi
etiketləməmək lazımdır (məs. ocr_extracted, verified deyil).
USSD üzərində autentifikasiya yoxdur — sözləşmə imzalama kimi
maliyyə əməliyyatları PIN/OTP tələb edir, hələ dizayn edilməyib.
PIN cəhdlərinə limit/lockout yoxdur — 4 rəqəmli PIN-i brute-force
etmək nəzəri olaraq mümkündür, V2-də həll edilməlidir.
6 skor göstəricisindən yalnız 2-si (arazi böyüklüyü, kooperativ
üzvlüyü) DB-də saxlanılır, qalan 4-ü (əkin tarixçəsi, TARSİM,
gübrə alımı, iqlim riski) hələ demo/sabit dəyərlərdir — real data
toplama mexanizmi (OCR və ya admin panel) gələcəkdə lazımdır.


Qovluq strukturu (təklif, ehtiyaca görə dəyiş)

agrikopru/
  CLAUDE.md
  docker-compose.yml          # postgres+postgis
  db/schema.sql
  services/
    scoring-engine/            # Python + FastAPI + XGBoost
    backend/                   # Node.js + Express
    ocr-service/                # Python + Tesseract
    ussd-simulator/             # veb-əsaslı simulyator
  apps/
    mobile-dashboard/           # React Native (Expo), B2B üçün
  docs/

Konvensiyalar


Kod identifikatorları (dəyişən/funksiya/cədvəl adları) İngilis dilində,
domen şərhləri istəsən Azərbaycan/Türk dilində ola bilər.
Hər mock servis funksiyası/faylı MOCK_ və ya mock_ prefiksi ilə
açıq işarələnməlidir.
Yeni asılılıq (npm/pip paketi) əlavə etməzdən əvvəl niyə lazım
olduğunu bir cümləylə qeyd et.
Layihə TEKNOFEST Türkiye üçün hazırlanır. Bütün istifadəçiyə görünən
mətn (UI etiketləri, mesajlar, demo data) standart Türkiye Türkçesi
ilə yazılmalıdır, başqa dil/ləhcə qarışmamalıdır.