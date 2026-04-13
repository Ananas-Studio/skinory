# Skinory Monorepo

Skinory, cilt bakımı ürünlerini taramak, analiz etmek ve kişiye özel öneriler sunmak için geliştirilmiş bir pnpm monorepo uygulamasıdır.

## Projeler

| Paket | Açıklama | Teknoloji |
|---|---|---|
| `apps/web` | Ana uygulama (SPA) | Vite 7 + React 19 |
| `apps/api` | Backend API | Express 5 + Sequelize 6 |
| `apps/landing` | Tanıtım sayfası | Next.js 16 (App Router) |
| `apps/e2e` | E2E testleri | Cypress 14 |
| `packages/ui` | Paylaşılan UI bileşenleri | shadcn + Radix UI |
| `packages/core` | İş mantığı yardımcıları | Framework-agnostic TS |

---

## Gereksinimler

- **Node.js** 20+ (`.nvmrc` mevcut)
- **pnpm** 10+
- **Docker** ve **Docker Compose**
- **Azure CLI** (üretim deploy için)

---

## Yerel Geliştirme

### 1. Bağımlılıkları kur

```bash
pnpm install
```

### 2. Ortam değişkenlerini ayarla

```bash
cp apps/api/.env.example apps/api/.env
# .env dosyasını düzenle:
#   DATABASE_URL=postgres://postgres:postgres@localhost:5432/skinory
#   OPENAI_API_KEY=sk-...
#   OPENAI_MODEL=gpt-4o-mini
```

### 3. PostgreSQL'i başlat

```bash
docker compose up postgres -d
```

### 4. Uygulamaları çalıştır

```bash
# API (port 4000)
pnpm --filter api dev

# Web (port 5173, /api → localhost:4000 proxy)
pnpm --filter web dev

# Landing (port 3001)
pnpm --filter landing dev
```

### 5. Test ve Build

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm e2e:web
pnpm e2e:landing
```

---

## Docker ile Yerel Çalıştırma

Tüm servisleri tek komutla ayağa kaldır:

```bash
# OpenAI key'i ayarla
export OPENAI_API_KEY=sk-...

# Tümünü başlat (postgres + api + web + landing)
docker compose up --build
```

| Servis | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:4000 |
| Landing | http://localhost:3001 |
| PostgreSQL | localhost:5432 |

---

## Azure'a Deploy Etme (Adım Adım)

### Mimari

```
┌─────────────────────────────────────────────────────────┐
│                    Azure (swedencentral)                 │
│  Resource Group: rg-skinory                             │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  skinory-web │  │skinory-land. │  │  skinory-api  │  │
│  │  (external)  │  │  (external)  │  │  (internal)   │  │
│  │  Vite+nginx  │  │   Next.js    │  │  Express API  │  │
│  │  port 3000   │  │  port 3001   │  │  port 4000    │  │
│  └──────┬───────┘  └──────────────┘  └───────▲───────┘  │
│         │           nginx /api/ proxy        │          │
│         └────────────────────────────────────┘          │
│                                                         │
│  ┌──────────────────┐  ┌────────────────────────────┐   │
│  │  Container Apps   │  │  PostgreSQL Flexible       │   │
│  │  Environment      │  │  Server (B1ms, v16)        │   │
│  └──────────────────┘  └────────────────────────────┘   │
│                                                         │
│  ┌──────────────────┐                                   │
│  │  Azure Container  │                                  │
│  │  Registry (ACR)   │                                  │
│  └──────────────────┘                                   │
└─────────────────────────────────────────────────────────┘
```

### Ön Koşullar

1. **Azure CLI** kurulu ve giriş yapılmış olmalı:
   ```bash
   # Azure CLI kur (macOS)
   brew install azure-cli

   # Azure'a giriş yap
   az login
   ```

2. **Docker Desktop** çalışıyor olmalı

3. **OpenAI API Key** hazır olmalı

### Adım 1: İlk Kurulum (Altyapı Oluşturma)

Bu adım Azure kaynaklarını (ACR, PostgreSQL, Container Apps Environment) oluşturur. **İlk sefer ~5-10 dakika sürer.**

```bash
# OpenAI key'ini ortam değişkeni olarak ayarla
export OPENAI_API_KEY="sk-..."

# (Opsiyonel) DB şifresini kendin belirle, yoksa otomatik üretilir
# export DB_PASSWORD="güçlü-bir-şifre"

# Altyapıyı kur
./infra/deploy.sh setup
```

> ⚠️ **ÖNEMLİ:** Setup sırasında üretilen DB şifresini kaydet! Deploy adımında tekrar gerekecek.

**Bu adım şunları oluşturur:**
- Resource Group (`rg-skinory`) — swedencentral
- Azure Container Registry (ACR) — Docker image'ları için
- PostgreSQL Flexible Server (B1ms) — veritabanı
- Container Apps Environment — container runtime ortamı

### Adım 2: Build ve Deploy

Bu adım Docker image'larını build eder, ACR'a push eder ve Container Apps'leri oluşturur.

```bash
# Key ve DB şifresinin ortam değişkenlerinde olduğundan emin ol
export OPENAI_API_KEY="sk-..."
export DB_PASSWORD="setup-adımındaki-şifre"

# Build + push + deploy
./infra/deploy.sh deploy
```

**Bu adım şunları yapar:**
1. 3 Docker image build eder (api, web, landing) — `linux/amd64` platform
2. Image'ları ACR'a push eder
3. Bicep ile Container Apps'leri oluşturur/günceller
4. Tamamlandığında URL'leri gösterir

### Adım 3: Doğrulama

```bash
# Durum kontrolü
./infra/deploy.sh status

# API health check (web proxy üzerinden)
curl https://<web-fqdn>/api/health
# Beklenen: {"ok":true,"data":{"status":"ok"}}
```

### Tek Komutla Tam Deploy

Setup ve deploy'u tek seferde yapmak için:

```bash
export OPENAI_API_KEY="sk-..."
./infra/deploy.sh all
```

### Güncelleme (Sonraki Deploy'lar)

Kod değişikliklerinden sonra sadece `deploy` yeterli:

```bash
export OPENAI_API_KEY="sk-..."
export DB_PASSWORD="mevcut-db-şifresi"
./infra/deploy.sh deploy
```

### Secret Güncelleme (API Key Değişikliği)

```bash
# Yeni key'i doğrudan container app'e uygula
az containerapp secret set \
  -n skinory-api \
  -g rg-skinory \
  --secrets "openai-api-key=yeni-key-buraya"

# API'yi yeniden başlat
az containerapp revision restart \
  -n skinory-api \
  -g rg-skinory \
  --revision $(az containerapp revision list -n skinory-api -g rg-skinory --query "[?properties.active].name" -o tsv)
```

### Logları İzleme

```bash
# API logları (canlı)
az containerapp logs show -n skinory-api -g rg-skinory --follow

# Web logları
az containerapp logs show -n skinory-web -g rg-skinory --follow

# Belirli revision logları
az containerapp logs show -n skinory-api -g rg-skinory --tail 50
```

### Kaynakları Silme

```bash
# Tüm Azure kaynaklarını sil (geri alınamaz!)
./infra/deploy.sh destroy
```

---

## CI/CD (GitHub Actions)

`main` branch'e push yapıldığında otomatik deploy tetiklenir. Sadece değişen servisler deploy edilir.

### Gerekli GitHub Secrets

| Secret | Açıklama |
|---|---|
| `AZURE_CREDENTIALS` | Azure Service Principal JSON |
| `ACR_NAME` | ACR adı (ör: `skinoryacr...`) |
| `ACR_LOGIN_SERVER` | ACR login server (ör: `skinoryacr....azurecr.io`) |
| `SLACK_WEBHOOK_URL` | *(Opsiyonel)* Bildirimler için |

### Manuel Tetikleme

GitHub Actions → Deploy → Run workflow → Hangi app'i deploy edeceğini seç (all/web/landing/api).

---

## Sorun Giderme

| Sorun | Çözüm |
|---|---|
| `502 Bad Gateway` on `/api/` | API container çalışıyor mu kontrol et: `az containerapp logs show -n skinory-api -g rg-skinory --tail 20` |
| DB bağlantı hatası | DB şifresinde `#` gibi özel karakter varsa URL-encode gerekir. Bicep'te `uriComponent()` kullanılıyor. |
| Docker build arm64/amd64 hatası | `--platform linux/amd64` flag'i gerekli. Deploy script bunu otomatik ekler. |
| `MaxNumberOfGlobalEnvironmentsInSubExceeded` | Free tier: 1 environment/subscription. Eski environment'ları sil. |
| PostgreSQL `LocationIsOfferRestricted` | Bazı region'larda kısıtlı. `swedencentral` çalışıyor. |
| nginx SNI hatası | `proxy_ssl_server_name on` gerekli. Mevcut config'de zaten var. |

---

## GitHub + Jira MCP Setup

Use MCP servers to let Copilot assist with sprint planning and issue triage across GitHub and Jira.

1. Set required tokens/env vars in your shell:

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token_here
export GITHUB_TOKEN=your_github_token_here

export JIRA_URL=https://your-domain.atlassian.net
export JIRA_API_MAIL=your.email@example.com
export JIRA_API_KEY=your_jira_api_token_here
```

2. MCP server config is committed at `.vscode/mcp.json`.
3. Reload VS Code and use Copilot with MCP enabled.
4. For sprint workflow details, follow `docs/github-mcp-sprint-planning.md`.
