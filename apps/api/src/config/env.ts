import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  username: process.env.DB_USERNAME ?? "postgres",
  password: process.env.DB_PASSWORD ?? "postgres",
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/skinory",
  dbConnectOnStart: (process.env.DB_CONNECT_ON_START ?? "true") === "true",
  dbSyncOnStart: (process.env.DB_SYNC_ON_START ?? "true") === "true",
  dbSyncForce: (process.env.DB_SYNC_FORCE ?? "false") === "true",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
} as const;
