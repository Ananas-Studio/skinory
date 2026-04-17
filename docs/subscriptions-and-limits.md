# Skinory — Subscription & Limits Planı

## Genel Bakış

Skinory'de kullanıcı erişimi **rol tabanlı** (Admin, Partner) ve **kota tabanlı** (Free, Basic, Pro, Premium) olarak iki eksende yönetilir. Rol, kullanıcının **ne yapabileceğini** belirler; abonelik planı ise **ne kadar yapabileceğini** belirler.

---

## 1. Roller (Erişim Yetkileri)

### 👑 Admin

| Özellik | Yetki |
|---------|-------|
| Tüm AI özellikleri | ✅ Sınırsız |
| Tüm tarama özellikleri | ✅ Sınırsız |
| Ürün ekleme / düzenleme / silme | ✅ Sınırsız |
| Marka ekleme / düzenleme | ✅ Sınırsız |
| İçerik (ingredient) yönetimi | ✅ Sınırsız |
| Kullanıcı yönetimi | ✅ |
| Abonelik tier değiştirme | ✅ |
| Tüm kullanıcıların verisini görme | ✅ |
| Rate limit muafiyeti | ✅ |
| Usage kota muafiyeti | ✅ |

> Admin'ler hiçbir kota veya rate limit kontrolüne tabi değildir. Sistem yönetimi, veri düzeltme ve destek operasyonları için tasarlanmıştır.

---

### 🤝 Partner

| Özellik | Yetki |
|---------|-------|
| Ürün ekleme | ✅ Sınırsız |
| Ürün düzenleme | ✅ Sınırsız |
| Ürün silme (soft-delete) | ✅ Sınırsız |
| Marka ekleme / düzenleme | ✅ Sınırsız |
| İçerik (ingredient) ekleme | ✅ Sınırsız |
| Barkod eşleme | ✅ Sınırsız |
| Toplu ürün import (CSV/JSON) | ✅ Sınırsız |
| AI özellikleri | Kendi planı dahilinde |
| Tarama özellikleri | Kendi planı dahilinde |
| Rutin & danışmanlık | Kendi planı dahilinde |
| Diğer kullanıcıların verisini görme | ❌ |
| Kullanıcı yönetimi | ❌ |

> Partner'lar ürün kataloğunu serbestçe yönetebilir. AI ve tarama gibi maliyetli özellikler ise atandıkları abonelik planı dahilinde çalışır (varsayılan: Pro).

---

### 👤 User (Standart Kullanıcı)

| Özellik | Yetki |
|---------|-------|
| Kendi profilini yönetme | ✅ |
| Envanter, rutin, favoriler | ✅ |
| Ürün arama & görüntüleme | ✅ |
| AI & tarama özellikleri | Planı dahilinde |
| Ürün ekleme / düzenleme | ❌ |
| Marka / içerik yönetimi | ❌ |

---

## 2. Abonelik Planları (Kota Limitleri)

Tüm limitler **aylık** sıfırlanır (her ayın 1'inde reset). `Infinity` = sınırsız.

### Karşılaştırma Tablosu

| Özellik | Free | Basic | Pro | Premium | Admin |
|---------|------|-------|-----|---------|-------|
| **AI Ürün Değerlendirme** | 3 | 15 | 50 | 200 | ∞ |
| **AI Cilt Danışmanı** | 5 | 25 | 100 | 500 | ∞ |
| **AI Sosyal Tespit** | 10 | 30 | 100 | 300 | ∞ |
| **Barkod Tarama** | 100 | 500 | 2.000 | 10.000 | ∞ |
| **OCR Tarama** | 20 | 50 | 200 | 1.000 | ∞ |
| **Görsel Tanıma** | 20 | 50 | 200 | 1.000 | ∞ |
| **Rutin Oluşturma** | 10 | 30 | 100 | 500 | ∞ |
| **Sosyal Scrape** | 30 | 100 | 500 | 2.000 | ∞ |
| **Sosyal Enrich** | 20 | 60 | 300 | 1.000 | ∞ |

---

### Plan Detayları

#### 🆓 Free (Mevcut "Demo")
- **Fiyat:** Ücretsiz
- **Hedef:** Uygulamayı keşfeden yeni kullanıcılar
- **Öne çıkan:** Temel tarama ve sınırlı AI deneyimi
- **Kısıtlamalar:** Düşük AI kotası, reklam gösterilebilir

#### 💡 Basic
- **Fiyat:** Aylık ücretli (giriş seviyesi)
- **Hedef:** Düzenli kullanan bireysel kullanıcılar
- **Öne çıkan:** Günlük kullanıma yetecek AI ve tarama kotası
- **Ek avantaj:** Reklamsız deneyim

#### ⭐ Pro
- **Fiyat:** Aylık ücretli (orta seviye)
- **Hedef:** Cilt bakımına önem veren aktif kullanıcılar ve Partner'lar
- **Öne çıkan:** Yüksek AI kotası, geniş sosyal tarama, toplu işlem desteği
- **Ek avantaj:** Öncelikli destek, erken erişim özellikleri
- **Not:** Partner rolü için varsayılan plan

#### 💎 Premium
- **Fiyat:** Aylık ücretli (en yüksek)
- **Hedef:** Profesyonel kullanıcılar, estheticianlar, influencer'lar
- **Öne çıkan:** Neredeyse sınırsız kullanım, yüksek hacimli sosyal analiz
- **Ek avantaj:** Özel destek kanalı, API erişimi (gelecek)

#### 👑 Admin (Dahili)
- **Fiyat:** Yok (dahili rol)
- **Hedef:** Sistem yöneticileri, geliştirme ekibi
- **Tüm özellikler:** Sınırsız, rate limit yok, kota yok

---

## 3. Rol × Plan Matrisi

| Rol | Varsayılan Plan | Kota Uygulanır mı? | Rate Limit Uygulanır mı? |
|-----|-----------------|---------------------|--------------------------|
| Admin | — (sınırsız) | ❌ Hayır | ❌ Hayır |
| Partner | Pro | ✅ Evet (plan dahilinde) | ✅ Evet (global limiter) |
| User | Free | ✅ Evet (plan dahilinde) | ✅ Evet (global limiter) |

---

## 4. Uygulama Notları

### Kullanıcı Modeli Değişiklikleri
```
users tablosuna eklenecek alanlar:
  - role: ENUM('user', 'partner', 'admin')  DEFAULT 'user'
  - tier_id: VARCHAR                          DEFAULT 'free'
```

### Middleware Akışı
```
Request
  → Auth (kim?)
  → Role Check (ne yapabilir?)
  → Rate Limit (admin değilse)
  → Usage Check (admin değilse, plan kotası dahilinde)
  → Handler
```

### Admin Bypass Mantığı
```typescript
// usage.middleware.ts içinde:
if (req.userRole === 'admin') return next()  // kota kontrolü atla

// rate-limit.middleware.ts içinde:
skip: (req) => req.userRole === 'admin'      // rate limit atla
```

### Partner Yetki Kontrolü
```typescript
// Ürün CRUD route'larında:
if (req.userRole !== 'admin' && req.userRole !== 'partner') {
  return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Product management requires partner or admin role' } })
}
```

---

## 5. Gelecek Düşünceler

| Konu | Açıklama |
|------|----------|
| **Yıllık plan** | Aylık fiyat × 10 (2 ay indirim) |
| **Takım planı** | Partner'lar için çoklu kullanıcı yönetimi |
| **API anahtarı** | Premium kullanıcılara REST API erişimi |
| **Özel limitler** | Partner bazlı özel kota tanımlama |
| **Kullanım bazlı fiyat** | Kota aşımında birim başı ücretlendirme (pay-as-you-go) |
| **Trial süresi** | Pro planı 7 gün ücretsiz deneme |
