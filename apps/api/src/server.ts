import { app } from "./app.js";
import { sequelize, testDatabaseConnection } from "./config/database.js";
import { env } from "./config/env.js";

async function bootstrap() {
  try {
    if (env.dbConnectOnStart) {
      await testDatabaseConnection();
      console.log("Database connection established");
    }

    const server = app.listen(env.port, () => {
      console.log(`API listening on port ${env.port}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}, shutting down`);
      server.close(async () => {
        await sequelize.close();
        process.exit(0);
      });
    };

    process.on("SIGINT", () => {
      void shutdown("SIGINT");
    });

    process.on("SIGTERM", () => {
      void shutdown("SIGTERM");
    });
  } catch (error) {
    console.error("Failed to start API", error);
    process.exit(1);
  }
}

void bootstrap();
