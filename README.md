# Skinory Monorepo

Skinory, `web`, `landing`, `ui`, `core` ve `e2e` paketlerinden oluşan bir pnpm monorepo yapısıdır.

## Projeler

- `apps/web` → Vite + React uygulaması
- `apps/landing` → Next.js uygulaması
- `apps/e2e` → Cypress e2e testleri
- `packages/ui` → shadcn tabanlı UI paketleri
- `packages/core` → paylaşılan core yardımcıları

## Hızlı Başlangıç

```bash
pnpm install
pnpm dev:web
pnpm dev:landing
```

## Test ve Build

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm e2e:web
pnpm e2e:landing
```

## Docker

```bash
docker compose up --build
```

## GitHub + Jira MCP Setup

Use MCP servers to let Copilot assist with sprint planning and issue triage across GitHub and Jira.

1. Set required tokens/env vars in your shell:

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token_here
export GITHUB_TOKEN=your_github_token_here

export JIRA_URL=https://your-domain.atlassian.net
export JIRA_API_MAIL=your.email@example.com
export JIRA_API_KEY=your_jira_api_token_here
```

2. MCP server config is committed at `.vscode/mcp.json`.
3. Reload VS Code and use Copilot with MCP enabled.
4. For sprint workflow details, follow `docs/github-mcp-sprint-planning.md`.
