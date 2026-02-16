# Skinory Monorepo

Skinory, `web`, `landing`, `ui`, `core` ve `e2e` paketlerinden oluşan bir pnpm monorepo yapısıdır.

## Projeler

- `apps/web` → Vite + React uygulaması
- `apps/landing` → Next.js uygulaması
- `apps/e2e` → Cypress e2e testleri
- `packages/ui` → shadcn tabanlı UI paketleri
- `packages/core` → paylaşılan core yardımcıları

## Hızlı Başlangıç

```bash
pnpm install
pnpm dev:web
pnpm dev:landing
```

## Test ve Build

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm e2e:web
pnpm e2e:landing
```

## Docker

```bash
docker compose up --build
```
