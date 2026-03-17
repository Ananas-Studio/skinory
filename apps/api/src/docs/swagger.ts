import { env } from "../config/env.js";

const serverUrl = env.nodeEnv === "production" ? "https://api.skinory.com" : `http://localhost:${env.port}`;

const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Skinory API",
    version: "0.1.0",
    description: "Skinory backend API documentation.",
  },
  servers: [{ url: serverUrl }],
  tags: [{ name: "Health" }, { name: "Auth" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      SuccessEnvelope: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
          data: { type: "object", additionalProperties: true },
        },
        required: ["ok", "data"],
      },
      ErrorEnvelope: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "AUTH_VALIDATION_FAILED" },
              message: { type: "string", example: "Invalid request body" },
              details: { nullable: true },
            },
            required: ["code", "message"],
          },
        },
        required: ["ok", "error"],
      },
      SignInRequest: {
        type: "object",
        properties: {
          provider: { type: "string", enum: ["google", "apple"] },
          providerUserId: { type: "string" },
          idToken: { type: "string" },
          email: { type: "string", format: "email" },
          fullName: { type: "string" },
          avatarUrl: { type: "string", format: "uri" },
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
        },
        required: ["provider", "providerUserId", "idToken"],
      },
      AddConnectionRequest: {
        type: "object",
        properties: {
          provider: { type: "string", enum: ["google", "apple"] },
          providerUserId: { type: "string" },
          idToken: { type: "string" },
          email: { type: "string", format: "email" },
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
        },
        required: ["provider", "providerUserId", "idToken"],
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Service health payload",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessEnvelope" },
              },
            },
          },
        },
      },
    },
    "/auth/provider/sign-in": {
      post: {
        tags: ["Auth"],
        summary: "Sign in with identity provider",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SignInRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Signed in successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessEnvelope" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get signed-in user profile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessEnvelope" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/auth/sign-out": {
      post: {
        tags: ["Auth"],
        summary: "Sign out current user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Signed out",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessEnvelope" },
              },
            },
          },
        },
      },
    },
    "/auth/connections": {
      get: {
        tags: ["Auth"],
        summary: "List linked provider connections",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Connections list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessEnvelope" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Auth"],
        summary: "Add provider connection",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AddConnectionRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Connection created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessEnvelope" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
    "/auth/connections/{provider}": {
      delete: {
        tags: ["Auth"],
        summary: "Remove provider connection",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "provider",
            required: true,
            schema: { type: "string", enum: ["google", "apple"] },
          },
        ],
        responses: {
          "200": {
            description: "Connection removed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessEnvelope" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
              },
            },
          },
        },
      },
    },
  },
} as const;

export { openApiDocument };
