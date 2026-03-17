# Skinory Web OAuth Test Playground

Bu uygulama, Google ve Apple OAuth entegrasyonunu gercek provider SDK'larini baglamadan once backend auth akisi uzerinde test etmek icin hazirlandi.

## Ne Yapar?

- `/auth/provider/sign-in` endpointine test payload'i gonderir
- Donen `user.id` degerini otomatik olarak `x-user-id` icin saklar
- Asagidaki korumali endpointleri tek ekranda test eder:
  - `GET /auth/me`
  - `GET /auth/connections`
  - `POST /auth/sign-out`

## Calistirma

Google butonunun gercek auth popup'i acabilmesi icin `apps/web/.env` dosyasina client id ekleyin:

```bash
VITE_GOOGLE_CLIENT_ID=your_google_web_client_id
```

1. API'yi baslatin (`apps/api`, varsayilan: `http://localhost:4000`)
2. Web uygulamasini baslatin:

```bash
pnpm --filter web dev
```

Vite config dosyasinda dev proxy tanimli oldugu icin `/auth/*` istekleri otomatik olarak API'ye yonlendirilir.

## Not

- Bu ekran test/mock amaclidir.
- `idToken` yalnizca dolu olma kontrolunden gecer; provider imza dogrulamasi API tarafinda henuz aktif degildir.
