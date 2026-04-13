# ── Stage 1: Install dependencies ──
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate
WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy only the package.json files needed
COPY apps/api/package.json ./apps/api/
COPY packages/core/package.json ./packages/core/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ──
FROM base AS builder
WORKDIR /app

# Copy source
COPY packages/core/ ./packages/core/
COPY apps/api/ ./apps/api/

# Build core first (api depends on it), then api
RUN pnpm --filter @skinory/core build
RUN pnpm --filter api build

# ── Stage 3: Production runner ──
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate
WORKDIR /app

ENV NODE_ENV=production

# Copy workspace config for pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/core/package.json ./packages/core/

RUN pnpm install --frozen-lockfile --prod

# Copy built output
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/core/dist ./packages/core/dist

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser
USER apiuser

EXPOSE 4000

ENV PORT=4000

CMD ["node", "apps/api/dist/server.js"]
