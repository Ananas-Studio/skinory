import { Sequelize } from "sequelize";
import { env } from "./env.js";
import { initModels } from "../models/index.js";
import { seedProfileOptions } from "../services/seed-profile-options.js";
import { runMigrations } from "../migrations/runner.js";

export const sequelize = new Sequelize(env.databaseUrl, {
  dialect: "postgres",
  username: env.username,
  password: env.password,
  logging: false,
  pool: {
    max: 20,
    min: 5,
    idle: 10000,
    acquire: 30000,
  },
});

export async function testDatabaseConnection(): Promise<void> {
  initModels(sequelize);
  await sequelize.authenticate();

  if (env.dbSyncOnStart) {
    await sequelize.sync({
      force: env.dbSyncForce,
      alter: !env.dbSyncForce,
    });
    await seedProfileOptions();
    await runMigrations();
  }
}
