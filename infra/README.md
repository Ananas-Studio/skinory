# Skinory Azure Deployment

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Azure Container Apps                   │
│                                                          │
│  ┌──────────┐    ┌───────────┐    ┌──────────────────┐  │
│  │   Web    │───▶│    API    │───▶│   PostgreSQL     │  │
│  │  (nginx) │    │ (Express) │    │  Flexible Server │  │
│  │  :3000   │    │   :4000   │    │     :5432        │  │
│  └──────────┘    └───────────┘    └──────────────────┘  │
│                                                          │
│  ┌──────────┐                                           │
│  │ Landing  │                                           │
│  │ (Next.js)│                                           │
│  │  :3001   │                                           │
│  └──────────┘                                           │
└─────────────────────────────────────────────────────────┘
```

| Service    | Type                | Access   | Scaling       |
|------------|---------------------|----------|---------------|
| Web        | Container App       | Public   | 0–5 replicas  |
| API        | Container App       | Internal | 0–3 replicas  |
| Landing    | Container App       | Public   | 0–3 replicas  |
| PostgreSQL | Flexible Server B1ms| Private  | Single        |
| ACR        | Basic               | Private  | —             |

## Prerequisites

- [Azure CLI](https://aka.ms/install-az-cli) (`az`)
- Docker
- An Azure subscription

## Quick Start

```bash
# 1. Login to Azure
az login

# 2. Set your OpenAI API key
export OPENAI_API_KEY="sk-..."

# 3. Deploy everything
./infra/deploy.sh all
```

## Commands

| Command | Description |
|---------|-------------|
| `./infra/deploy.sh setup` | Create Azure resources (first time) |
| `./infra/deploy.sh deploy` | Build & push images, update containers |
| `./infra/deploy.sh deploy v1.2.3` | Deploy with a specific image tag |
| `./infra/deploy.sh all` | setup + deploy in one go |
| `./infra/deploy.sh status` | Show running container apps |
| `./infra/deploy.sh destroy` | Delete all Azure resources |

## GitHub Actions CI/CD

The deploy workflow (`.github/workflows/deploy.yml`) automatically deploys on push to `main`.

### Required Secrets

Set these in GitHub repo Settings → Secrets:

| Secret | Description |
|--------|-------------|
| `AZURE_CREDENTIALS` | Service principal JSON for Azure login |
| `ACR_NAME` | Azure Container Registry name |
| `ACR_LOGIN_SERVER` | ACR login server (e.g., `skinoryacrxyz.azurecr.io`) |
| `SLACK_WEBHOOK_URL` | (Optional) Slack notifications |

### Create Azure Service Principal

```bash
az ad sp create-for-rbac \
  --name "skinory-github" \
  --role contributor \
  --scopes /subscriptions/<SUB_ID>/resourceGroups/rg-skinory \
  --json-auth
```

Copy the JSON output as the `AZURE_CREDENTIALS` secret.

## Local Docker Development

```bash
# Start all services locally
docker compose up --build

# Services available at:
# Web:     http://localhost:3000
# API:     http://localhost:4000
# Landing: http://localhost:3001
# DB:      localhost:5432
```

## Environment Variables

### API Container

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Server port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model |
| `DB_SYNC_ON_START` | `true` | Auto-sync schema |
| `DB_SYNC_FORCE` | `false` | Drop & recreate tables |

### Web Container

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | `http://api:4000` | Backend API URL for nginx proxy |

## Cost Estimate (West Europe)

| Resource | ~Monthly Cost |
|----------|---------------|
| Container Apps (scale-to-zero) | $0–15 |
| PostgreSQL B1ms | ~$13 |
| ACR Basic | ~$5 |
| **Total** | **~$18–33** |
