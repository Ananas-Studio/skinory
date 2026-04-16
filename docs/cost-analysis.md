# Skinory Maliyet Analizi

> Son güncelleme: 16 Nisan 2026
> Bölge: Sweden Central (İsveç)
> Para birimi: USD ($)

---

## Genel Bakış

Skinory şu anda iki ana maliyet kaynağı kullanıyor:

1. **Azure bulut altyapısı** — sunucular, veritabanı, görsel depolama
2. **Dış servisler** — yapay zeka, ürün veritabanı, web kazıma

Aylık tahmini toplam: **~$116 – $161**

---

## 1. Azure Bulut Altyapısı (Detaylı)

### 1.1. Veritabanı — PostgreSQL

Kullanıcı bilgileri, ürünler, envanterler, rutinler, tarama geçmişi ve tüm uygulama verilerinin tutulduğu merkezi veri deposu.

| Özellik | Değer |
|---------|-------|
| Plan | Standard B1ms (Burstable) |
| İşlemci | 1 çekirdek |
| Bellek | 2 GB RAM |
| Disk alanı | 32 GB |
| Yedekleme | 7 gün geriye dönük |
| PostgreSQL sürümü | 16 |

| Maliyet kalemi | Aylık tutar |
|---------------|-------------|
| Sunucu (B1ms) | ~$23 |
| Depolama (32 GB) | ~$4 |
| Yedekleme | Dahil (7 güne kadar ücretsiz) |
| **Alt toplam** | **~$27** |

> 📌 Bu, Skinory'nin en büyük sabit gideri. Kullanıcı sayısı ne olursa olsun bu tutar değişmiyor.

---

### 1.2. API Sunucusu (Container App)

Ürün tarama, yapay zeka değerlendirme, rutin oluşturma ve tüm arka plan işlemlerini yürüten sunucu.

| Özellik | Değer |
|---------|-------|
| İşlemci | 0.5 vCPU |
| Bellek | 1 GB RAM |
| Minimum kopya | 1 (her zaman açık) |
| Maksimum kopya | 3 (yoğun trafikte) |
| Erişim | Dahili (sadece Web uygulaması erişir) |

| Maliyet kalemi | Hesaplama | Aylık tutar |
|---------------|-----------|-------------|
| İşlemci (0.5 vCPU × 24 saat × 30 gün) | 1.296.000 saniye × $0,000024 | ~$31 |
| Bellek (1 GB × 24 saat × 30 gün) | 2.592.000 saniye × $0,0000025 | ~$6 |
| Ücretsiz kota düşümü | -180K vCPU-sn, -360K GiB-sn | ~-$5 |
| İstekler | Aylık ~100K istek | ~$0,04 |
| **Alt toplam (minimum 1 kopya)** | | **~$32** |
| **Yoğun dönemde (ort. 2 kopya)** | | **~$64** |

> ⚠️ API sunucusu minimum 1 kopya olarak ayarlı, yani hiç kullanıcı olmasa bile çalışıyor. Bunun sebebi ilk isteğin gecikmesini (soğuk başlangıç) önlemek.

---

### 1.3. Web Uygulaması (Container App)

Kullanıcıların telefonlarında kullandığı arayüz. Statik dosyaları sunan bir nginx sunucusu.

| Özellik | Değer |
|---------|-------|
| İşlemci | 0.25 vCPU |
| Bellek | 0.5 GB RAM |
| Minimum kopya | 0 (kullanılmadığında kapanır) |
| Maksimum kopya | 5 (yoğun trafikte) |
| Erişim | Herkese açık |

| Maliyet kalemi | Hesaplama | Aylık tutar |
|---------------|-----------|-------------|
| Düşük trafik (günde 4 saat aktif) | 120 saat/ay | ~$3 |
| Orta trafik (günde 12 saat aktif) | 360 saat/ay | ~$8 |
| Yoğun trafik (sürekli, 2 kopya) | 720+ saat/ay | ~$16 |
| **Tahmini ortalama** | | **~$3-8** |

> ✅ Kullanılmadığında 0'a ölçeklendiği için çok az trafik varken neredeyse ücretsiz.

---

### 1.4. Tanıtım Sayfası — Landing (Container App)

Skinory.com tanıtım ve bilgilendirme sayfası.

| Özellik | Değer |
|---------|-------|
| İşlemci | 0.25 vCPU |
| Bellek | 0.5 GB RAM |
| Minimum kopya | 0 |
| Maksimum kopya | 3 |

| Maliyet kalemi | Aylık tutar |
|---------------|-------------|
| **Tahmini ortalama** | **~$1-5** |

> ✅ Tanıtım sayfası çok az ziyaret alıyorsa neredeyse maliyetsiz.

---

### 1.5. Görsel Depolama (Azure Blob Storage) — YENİ

Ürün fotoğraflarının kalıcı olarak saklandığı alan. Bugün eklendi.

| Özellik | Değer |
|---------|-------|
| Plan | Standard LRS (tek bölge yedekleme) |
| Erişim tipi | Hot (sık erişim) |
| Container | product-images |

| Maliyet kalemi | Birim fiyat | Tahmini tutar |
|---------------|-------------|---------------|
| Depolama | $0,021 / GB / ay | |
| Okuma işlemi | $0,0004 / 10.000 istek | |
| Yazma işlemi | $0,005 / 10.000 istek | |
| Veri çıkışı | İlk 100 GB/ay ücretsiz | |
| | | |
| 100 ürün görseli (~50 MB) | | ~$0,01 |
| 1.000 ürün görseli (~500 MB) | | ~$0,01 |
| 10.000 ürün görseli (~5 GB) | | ~$0,11 |
| **Tahmini (ilk yıl)** | | **< $1** |

> ✅ Görsel depolama fiilen sıfır maliyetli. Onbinlerce ürün görseli bile 1 doları geçmez.

---

### 1.6. Container Registry (ACR)

Docker uygulama paketlerinin saklandığı depo. Her deploy'da yeni image buraya yüklenir.

| Özellik | Değer |
|---------|-------|
| Plan | Basic |
| Dahil depolama | 10 GB |
| Mevcut kullanım | ~185 MB (3 uygulama) |

| Kalem | Aylık tutar |
|-------|-------------|
| Sabit ücret | ~$5 |
| Ek depolama | $0 (10 GB sınırı içinde) |
| **Alt toplam** | **~$5** |

---

### 1.7. Log Analytics

Hata kayıtları, performans ölçümleri ve uygulama logları.

| Özellik | Değer |
|---------|-------|
| Plan | PerGB2018 (kullandıkça öde) |
| Saklama süresi | 30 gün (ücretsiz) |
| Tahmini aylık log hacmi | 1-3 GB |

| Kalem | Birim fiyat | Aylık tutar |
|-------|-------------|-------------|
| Veri alımı | ~$2,20 / GB | ~$2-7 |
| İlk 5 GB/ay (Container Apps dahil) | Ücretsiz | $0 |
| **Tahmini** | | **~$0-5** |

---

### Azure Toplam Özeti

| Servis | Düşük Kullanım | Orta Kullanım | Yoğun Kullanım |
|--------|---------------|---------------|----------------|
| PostgreSQL | $27 | $27 | $27 |
| API Sunucusu | $32 | $32 | $64 |
| Web Uygulaması | $3 | $8 | $16 |
| Landing | $1 | $3 | $5 |
| Görsel Depolama | <$1 | <$1 | <$1 |
| Container Registry | $5 | $5 | $5 |
| Log Analytics | $0 | $3 | $5 |
| **TOPLAM** | **~$68** | **~$78** | **~$122** |

---

## 2. Dış Servisler

### 2.1. OpenAI — Yapay Zeka (GPT-4o-mini)

Ürün değerlendirme ("Bu ürünü almalı mısın?") ve AI danışman sohbetleri için kullanılıyor.

| Özellik | Değer |
|---------|-------|
| Model | GPT-4o-mini |
| Giriş fiyatı | $0,15 / 1 milyon token |
| Çıkış fiyatı | $0,60 / 1 milyon token |

| Senaryo | Aylık istek | Tahmini maliyet |
|---------|------------|----------------|
| 10 kullanıcı, günde 2 değerlendirme | ~600 istek | **~$0,50** |
| 100 kullanıcı, günde 3 değerlendirme | ~9.000 istek | **~$3-5** |
| 1.000 kullanıcı, günde 5 değerlendirme | ~150.000 istek | **~$20-30** |

> ✅ GPT-4o-mini çok uygun fiyatlı. Binlerce kullanıcıya kadar aylık $30'ı geçmesi zor.

---

### 2.2. ScrapingBee — Web Kazıma

Hepsiburada, Sephora, Amazon gibi erişimi zor sitelerden ürün bilgisi çekmek için kullanılıyor.

| Plan | Aylık kredi | Fiyat |
|------|------------|-------|
| Ücretsiz | 1.000 | $0 |
| Freelance | 250.000 | $49/ay |
| Startup | 1.000.000 | $99/ay |
| Business | 3.000.000 | $249/ay |

| İşlem tipi | Kredi maliyeti |
|-----------|---------------|
| Basit sayfa çekme | 1 kredi |
| JavaScript destekli çekme | 5 kredi |
| Premium proxy ile çekme | 10-25 kredi |
| AI veri çıkarma | +5 kredi |
| Gizli mod (stealth) | 75 kredi |

| Senaryo | Aylık kullanım | Gerekli plan | Maliyet |
|---------|---------------|-------------|---------|
| Günde 5-10 ürün linki | ~300 istek (~1.500 kredi) | Ücretsiz (1K) veya Freelance | **$0-49** |
| Günde 50 ürün linki | ~1.500 istek (~7.500 kredi) | Freelance (250K) | **$49** |
| Günde 500 ürün linki | ~15.000 istek (~75.000 kredi) | Freelance (250K) | **$49** |

> ⚠️ ScrapingBee sadece doğrudan erişilemeyen siteler için devreye giriyor. Çoğu durumda önce ücretsiz doğrudan erişim deneniyor. Gerçek kredi kullanımı tahminlerden çok daha düşük olabilir.

---

### 2.3. Open Beauty Facts — Ürün Veritabanı

Barkod taraması ile ürün bilgisi sorgulama (isim, marka, içerikler, fotoğraf).

| Özellik | Değer |
|---------|-------|
| Fiyat | **Tamamen ücretsiz** |
| Lisans | Açık kaynak (Open Database License) |
| Kullanım limiti | Yok |

> ✅ Sınırsız kullanım, sıfır maliyet.

---

### Dış Servisler Toplam Özeti

| Servis | Düşük Kullanım | Orta Kullanım | Yoğun Kullanım |
|--------|---------------|---------------|----------------|
| OpenAI (GPT-4o-mini) | $0,50 | $5 | $30 |
| ScrapingBee | $0 (ücretsiz plan) | $49 | $49 |
| Open Beauty Facts | $0 | $0 | $0 |
| **TOPLAM** | **~$1** | **~$54** | **~$79** |

---

## 3. Genel Maliyet Tablosu

| Kalem | Düşük Kullanım | Orta Kullanım | Yoğun Kullanım |
|-------|---------------|---------------|----------------|
| Azure Altyapı | $68 | $78 | $122 |
| Dış Servisler | $1 | $54 | $79 |
| **GENEL TOPLAM** | **~$69/ay** | **~$132/ay** | **~$201/ay** |

### Kullanım senaryoları:

- **Düşük kullanım:** 10-50 kullanıcı, test/geliştirme aşaması, ScrapingBee ücretsiz plan
- **Orta kullanım:** 100-500 kullanıcı, düzenli günlük kullanım, ScrapingBee Freelance plan
- **Yoğun kullanım:** 1.000+ kullanıcı, yoğun tarama ve değerlendirme, API 2 kopya

---

## 4. Maliyet Düşürme Fırsatları

### Hemen uygulanabilir (toplam tasarruf: ~$30-40/ay)

| Öneri | Tasarruf | Risk |
|-------|---------|------|
| API sunucusunu 0'a ölçeklenebilir yapma (`minReplicas: 0`) | ~$32/ay | İlk istekte 5-10 saniye gecikme (soğuk başlangıç) |
| ScrapingBee'yi ihtiyaç oldukça açma (link taraması az ise) | ~$49/ay | Link taraması yapılamaz (barkod taraması etkilenmez) |

### Orta vadede değerlendirilebilir

| Öneri | Tasarruf | Açıklama |
|-------|---------|----------|
| PostgreSQL'i daha ucuz bir plana geçirme | ~$10/ay | Azure B_Standard_B1ms → Cosmos DB for PostgreSQL veya Neon (ücretsiz katman) |
| Landing sayfasını statik hosting'e taşıma | ~$3-5/ay | Azure Static Web Apps ücretsiz planı yeterli olabilir |
| ACR yerine GitHub Container Registry | ~$5/ay | GitHub Actions ile entegre, ücretsiz |

### Kullanıcı sayısına göre maliyet projeksiyonu

| Kullanıcı sayısı | Aylık tahmini maliyet | Kullanıcı başı maliyet |
|-----------------|----------------------|----------------------|
| 10 | ~$69 | $6,90 |
| 50 | ~$75 | $1,50 |
| 100 | ~$90 | $0,90 |
| 500 | ~$132 | $0,26 |
| 1.000 | ~$165 | $0,17 |
| 5.000 | ~$250 | $0,05 |

> 💡 Ölçek büyüdükçe kullanıcı başı maliyet hızla düşüyor. Sabit giderler (DB, ACR) değişmezken, değişken giderler (Container Apps, OpenAI) çok yavaş artıyor.

---

## 5. Maliyet Takibi

Azure maliyetlerini takip etmek için:

- **Azure Portal → Cost Management** üzerinden günlük/haftalık/aylık harcamalar izlenebilir
- **Bütçe uyarısı** kurularak belirli bir tutarı geçtiğinde e-posta bildirimi alınabilir
- **Resource Group (rg-skinory)** bazında filtrelenerek sadece Skinory maliyetleri görülebilir

ScrapingBee ve OpenAI için:

- **ScrapingBee Dashboard** üzerinden kalan kredi ve kullanım izlenebilir
- **OpenAI Platform → Usage** sayfasından token kullanımı ve maliyet görüntülenebilir
