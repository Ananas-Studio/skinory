# ── Stage 1: Install dependencies ──
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate
WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy only the package.json files needed
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ──
FROM base AS builder
WORKDIR /app

# Copy source
COPY packages/core/ ./packages/core/
COPY packages/ui/ ./packages/ui/
COPY apps/web/ ./apps/web/

RUN pnpm --filter web build

# ── Stage 3: Serve with nginx ──
FROM nginx:alpine AS runner

# Use templates dir for env-var substitution at startup
COPY apps/web/nginx.conf /etc/nginx/templates/default.conf.template

# Copy built assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Default API_URL for docker-compose local dev
ENV API_URL=http://api:4000

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
