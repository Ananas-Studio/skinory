import { Sequelize } from "sequelize";
import { env } from "./env.js";
import { initModels } from "../models/index.js";

export const sequelize = new Sequelize(env.databaseUrl, {
  dialect: "postgres",
  username: env.username,
  password: env.password,
  logging: false // env.nodeEnv === "development" ? console.log : false,
});

export async function testDatabaseConnection(): Promise<void> {
  initModels(sequelize);
  await sequelize.authenticate();

  if (env.dbSyncOnStart) {
    await sequelize.sync({
      force: env.dbSyncForce,
      alter: !env.dbSyncForce,
    });
  }
}
