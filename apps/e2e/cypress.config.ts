import { defineConfig } from "cypress";

const projectConfigs: Record<string, { baseUrl: string; specPattern: string }> =
  {
    web: {
      baseUrl: "http://localhost:5173",
      specPattern: "cypress/web/**/*.cy.ts",
    },
    landing: {
      baseUrl: "http://localhost:3001",
      specPattern: "cypress/landing/**/*.cy.ts",
    },
  };

export default defineConfig({
  e2e: {
    setupNodeEvents(_on, config) {
      const project = (config.env["project"] as string) || "web";
      const projectConfig = projectConfigs[project];

      if (!projectConfig) {
        throw new Error(
          `Unknown project "${project}". Available: ${Object.keys(projectConfigs).join(", ")}`
        );
      }

      config.baseUrl = projectConfig.baseUrl;
      config.specPattern = projectConfig.specPattern;

      return config;
    },
    supportFile: "cypress/support/e2e.ts",
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    viewportWidth: 1280,
    viewportHeight: 720,
  },
});
