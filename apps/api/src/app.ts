import express from "express";
import swaggerUi from "swagger-ui-express";
import { getHealthPayload } from "./services/health.service.js";
import { openApiDocument } from "./docs/swagger.js";
import { router } from "./routes/index.js";
import { globalLimiter } from "./middlewares/rate-limit.middleware.js";

const app = express();

// ─── CORS ───
app.use((_req, res, next) => {
  const origin = _req.headers.origin
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,x-user-id")
    res.setHeader("Access-Control-Allow-Credentials", "true")
    res.setHeader("Access-Control-Max-Age", "86400")
  }
  if (_req.method === "OPTIONS") {
    res.status(204).end()
    return
  }
  next()
})

app.use(express.json({ limit: "1mb" }));
app.use(globalLimiter);

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, data: getHealthPayload() });
});

app.get("/docs.json", (_req, res) => {
  res.status(200).json(openApiDocument);
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use(router);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled API error", error);

  res.status(500).json({
    ok: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error",
    },
  });
});

export { app };
