# E2E Tests — Cypress

Monorepo genelinde tüm projelerin e2e testlerini bu paket yönetir.

## Yapı

```
cypress/
├── fixtures/       # Test fixture dosyaları
├── support/
│   ├── commands.ts # Özel Cypress komutları
│   └── e2e.ts      # Global setup
├── web/            # Web uygulaması testleri
│   └── home.cy.ts
└── landing/        # Landing uygulaması testleri
    └── home.cy.ts
```

## Kullanım

### Testleri Çalıştırma (Headless)

```bash
# Root'tan
pnpm e2e:web
pnpm e2e:landing

# e2e klasöründen
pnpm e2e:web
pnpm e2e:landing
```

### Cypress GUI ile Çalıştırma

```bash
cd apps/e2e
pnpm e2e:web:open
pnpm e2e:landing:open
```

### Ön Koşullar

Testleri çalıştırmadan önce ilgili uygulamanın çalışıyor olması gerekir:

- **Web:** `pnpm dev:web` (port 5173)
- **Landing:** `pnpm dev:landing` ile `--port 3001` (port 3001)

## Yeni Test Ekleme

- Web testleri → `cypress/web/` klasörüne `*.cy.ts` dosyası ekleyin
- Landing testleri → `cypress/landing/` klasörüne `*.cy.ts` dosyası ekleyin
