# Skinory Maliyet Özeti

> Son güncelleme: 16 Nisan 2026 · Tüm fiyatlar aylık ve USD ($) cinsindendir.

---

## Ne Kadar Ödüyoruz?

| | Az Kullanıcı | Orta Kullanıcı | Çok Kullanıcı |
|---|---|---|---|
| **Aylık toplam** | **~$69** | **~$132** | **~$201** |

- **Az kullanıcı** = 10-50 kişi (test/başlangıç dönemi)
- **Orta kullanıcı** = 100-500 kişi (aktif kullanım)
- **Çok kullanıcı** = 1.000+ kişi (yoğun dönem)

---

## Paralar Nereye Gidiyor?

| Hizmet | Ne İşe Yarıyor? | Aylık Tutar |
|--------|-----------------|-------------|
| 🗄️ Veritabanı | Kullanıcı, ürün ve tüm verileri saklıyor | **~$27** |
| ⚙️ API Sunucusu | Barkod tarama, yapay zeka gibi işleri yapıyor | **~$32** |
| 🌐 Web Uygulaması | Kullanıcıların gördüğü arayüz | **~$3-8** |
| 🏠 Tanıtım Sayfası | skinory.com ana sayfası | **~$1-5** |
| 📦 Diğer Azure | Görsel depolama, loglar, paket deposu | **~$6** |
| 🤖 Yapay Zeka (OpenAI) | Ürün değerlendirme ve AI danışman | **~$1-30** |
| 🔍 ScrapingBee | Link ile ürün bilgisi çekme | **$0-49** |
| 📸 Open Beauty Facts | Barkod ile ürün bilgisi sorgulama | **Ücretsiz** |

> En büyük iki gider: **veritabanı ($27)** ve **API sunucusu ($32)**. Bunlar kullanıcı olmasa bile çalışıyor.

---

## Kullanıcı Başına Ne Kadara Geliyor?

| Kullanıcı Sayısı | Kişi Başı Aylık Maliyet |
|-----------------|------------------------|
| 10 kişi | ~$6,90 |
| 50 kişi | ~$1,50 |
| 100 kişi | ~$0,90 |
| 500 kişi | ~$0,26 |
| 1.000 kişi | ~$0,17 |

> Kullanıcı arttıkça kişi başı maliyet çok hızlı düşüyor.

---

## Nasıl Tasarruf Edebiliriz?

| Ne Yapılabilir? | Ne Kadar Tasarruf? |
|-----------------|-------------------|
| API sunucusunu boşta kapatma | ~$32/ay (ama ilk açılışta biraz bekleme olur) |
| ScrapingBee'yi sadece gerektiğinde açma | ~$49/ay (link taraması geçici olarak çalışmaz) |
| Veritabanını ücretsiz alternatiflere taşıma | ~$27/ay (göç işlemi gerekir) |

---

## Özet

- 💰 **Başlangıç maliyeti:** Aylık ~$69 (en düşük senaryo)
- 📈 **Büyüdükçe:** Maliyet çok yavaş artıyor, kişi başı maliyet hızla düşüyor
- ✅ **En ucuz kalemler:** Görsel depolama (<$1) ve yapay zeka ($1-5)
- ⚠️ **En pahalı kalemler:** Veritabanı ($27) ve API sunucusu ($32) — bunlar sabittir

> Detaylı teknik analiz için: [cost-analysis.md](./cost-analysis.md)
