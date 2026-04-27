#!/usr/bin/env bash
# ─── Skinory Azure Deployment Script ───
# Usage:
#   First-time full deploy:  ./infra/deploy.sh all
#   Infra only:              ./infra/deploy.sh setup
#   Build+push+deploy:      ./infra/deploy.sh deploy [tag]
#   Destroy everything:      ./infra/deploy.sh destroy
#   Show status:             ./infra/deploy.sh status
set -euo pipefail

# ─── Configuration ───
RESOURCE_GROUP="rg-skinory"
LOCATION="francecentral"
IMAGE_TAG="${2:-latest}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ─── Colors ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[skinory]${NC} $*"; }
ok()   { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }

# ─── Pre-flight checks ───
preflight() {
  log "Running pre-flight checks..."
  command -v az >/dev/null 2>&1 || { err "Azure CLI (az) not found. Install: https://aka.ms/install-az-cli"; exit 1; }
  command -v docker >/dev/null 2>&1 || { err "Docker not found."; exit 1; }

  if ! az account show >/dev/null 2>&1; then
    warn "Not logged into Azure. Running 'az login'..."
    az login
  fi

  ok "Pre-flight checks passed"
  log "Subscription: $(az account show --query name -o tsv)"
}

# ─── Phase 1: Create base infra (ACR, DB, Environment) ───
setup() {
  log "Creating resource group '${RESOURCE_GROUP}' in '${LOCATION}'..."
  az group create --name "$RESOURCE_GROUP" --location "$LOCATION" -o none
  ok "Resource group ready"

  # Prompt for secrets if not set
  if [ -z "${OPENAI_API_KEY:-}" ]; then
    read -rsp "Enter your OpenAI API key: " OPENAI_API_KEY
    echo
  fi
  if [ -z "${SCRAPINGBEE_API_KEY:-}" ]; then
    read -rsp "Enter your ScrapingBee API key (or press Enter to skip): " SCRAPINGBEE_API_KEY
    echo
  fi

  # Check if DB server already exists to avoid password mismatch
  local db_exists
  db_exists=$(az postgres flexible-server list -g "$RESOURCE_GROUP" --query "[0].name" -o tsv 2>/dev/null || echo "")

  if [ -z "${DB_PASSWORD:-}" ]; then
    if [ -n "$db_exists" ]; then
      warn "PostgreSQL server '$db_exists' already exists."
      warn "You MUST provide the existing DB password to avoid auth mismatch."
      read -rsp "Enter your existing DB password: " DB_PASSWORD
      echo
      if [ -z "$DB_PASSWORD" ]; then
        err "DB password is required when server already exists."
        exit 1
      fi
    else
      DB_PASSWORD="Sk1n$(openssl rand -hex 6)#1"
      warn "Generated DB password — save it securely: $DB_PASSWORD"
    fi
  fi

  # When DB exists, sync the password to ensure Bicep connection string matches
  if [ -n "$db_exists" ]; then
    log "Syncing DB password to existing server '$db_exists'..."
    az postgres flexible-server update \
      --resource-group "$RESOURCE_GROUP" \
      --name "$db_exists" \
      --admin-password "$DB_PASSWORD" \
      -o none
    ok "DB password synced"
  fi

  log "Deploying base infrastructure (ACR + PostgreSQL + Environment)..."
  log "This takes ~5-10 minutes on first run..."

  az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file "$REPO_ROOT/infra/main.bicep" \
    --parameters \
      openaiApiKey="$OPENAI_API_KEY" \
      scrapingbeeApiKey="${SCRAPINGBEE_API_KEY:-}" \
      dbPassword="$DB_PASSWORD" \
      imageTag="$IMAGE_TAG" \
      deployApps=false \
    -o none

  ok "Base infrastructure deployed"

  # Read outputs
  local acr_name
  acr_name=$(az acr list -g "$RESOURCE_GROUP" --query "[0].name" -o tsv)
  local acr_login
  acr_login=$(az acr list -g "$RESOURCE_GROUP" --query "[0].loginServer" -o tsv)
  local db_host
  db_host=$(az postgres flexible-server list -g "$RESOURCE_GROUP" --query "[0].fullyQualifiedDomainName" -o tsv)

  echo ""
  ok "ACR:  $acr_login"
  ok "DB:   $db_host"
  echo ""
  log "Next: run './infra/deploy.sh deploy' to build images and create container apps"
}

# ─── Phase 2: Build and push Docker images to ACR ───
build_and_push() {
  local acr_name acr_login
  acr_name=$(az acr list -g "$RESOURCE_GROUP" --query "[0].name" -o tsv)
  acr_login=$(az acr list -g "$RESOURCE_GROUP" --query "[0].loginServer" -o tsv)

  if [ -z "$acr_name" ]; then
    err "No ACR found. Run './infra/deploy.sh setup' first."
    exit 1
  fi

  log "Logging into ACR: $acr_login"
  az acr login --name "$acr_name"

  for APP in api web landing; do
    log "Building ${APP}..."
    docker build \
      --platform linux/amd64 \
      -f "$REPO_ROOT/apps/$APP/Dockerfile" \
      -t "$acr_login/skinory/$APP:$IMAGE_TAG" \
      -t "$acr_login/skinory/$APP:latest" \
      "$REPO_ROOT"

    log "Pushing ${APP}..."
    docker push "$acr_login/skinory/$APP:$IMAGE_TAG"
    docker push "$acr_login/skinory/$APP:latest"
    ok "$APP image pushed"
  done
}

# ─── Phase 3: Create/update Container Apps ───
deploy_apps() {
  log "Deploying container apps..."

  # Re-read secrets (needed for Bicep redeployment)
  if [ -z "${OPENAI_API_KEY:-}" ]; then
    read -rsp "Enter your OpenAI API key: " OPENAI_API_KEY
    echo
  fi
  if [ -z "${SCRAPINGBEE_API_KEY:-}" ]; then
    read -rsp "Enter your ScrapingBee API key (or press Enter to skip): " SCRAPINGBEE_API_KEY
    echo
  fi

  # Check if DB server exists — require existing password, never generate a new one here
  local db_exists
  db_exists=$(az postgres flexible-server list -g "$RESOURCE_GROUP" --query "[0].name" -o tsv 2>/dev/null || echo "")

  if [ -z "${DB_PASSWORD:-}" ]; then
    if [ -n "$db_exists" ]; then
      read -rsp "Enter your existing DB password: " DB_PASSWORD
      echo
    else
      err "No DB server found. Run './infra/deploy.sh setup' first."
      exit 1
    fi
  fi

  # Sync password to DB before deploying apps to ensure connection string matches
  if [ -n "$db_exists" ]; then
    log "Syncing DB password to server '$db_exists'..."
    az postgres flexible-server update \
      --resource-group "$RESOURCE_GROUP" \
      --name "$db_exists" \
      --admin-password "$DB_PASSWORD" \
      -o none
    ok "DB password synced"
  fi

  az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file "$REPO_ROOT/infra/main.bicep" \
    --parameters \
      openaiApiKey="$OPENAI_API_KEY" \
      scrapingbeeApiKey="${SCRAPINGBEE_API_KEY:-}" \
      dbPassword="$DB_PASSWORD" \
      imageTag="$IMAGE_TAG" \
      deployApps=true \
    -o none

  ok "Container apps deployed"
  echo ""

  # Print URLs
  for APP in api web landing; do
    local fqdn
    fqdn=$(az containerapp show -n "skinory-${APP}" -g "$RESOURCE_GROUP" --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null || echo "n/a")
    ok "${APP}: https://${fqdn}"
  done
}

# ─── Combined deploy (build+push+create apps) ───
deploy() {
  build_and_push
  deploy_apps
}

# ─── Destroy ───
destroy() {
  warn "This will DELETE all Skinory Azure resources!"
  read -rp "Type 'yes' to confirm: " confirm
  if [ "$confirm" = "yes" ]; then
    az group delete --name "$RESOURCE_GROUP" --yes --no-wait
    ok "Resource group deletion initiated"
  else
    log "Cancelled"
  fi
}

# ─── Status ───
status() {
  log "Resources in $RESOURCE_GROUP:"
  az resource list -g "$RESOURCE_GROUP" --query "[].{Name:name, Type:type}" -o table 2>/dev/null || warn "No resources found"
  echo ""
  log "Container Apps:"
  az containerapp list -g "$RESOURCE_GROUP" -o table 2>/dev/null || warn "No container apps found"
}

# ─── Main ───
case "${1:-help}" in
  setup)   preflight && setup ;;
  deploy)  preflight && deploy ;;
  all)     preflight && setup && deploy ;;
  destroy) preflight && destroy ;;
  status)  preflight && status ;;
  *)
    echo "Usage: $0 {setup|deploy|all|destroy|status} [image-tag]"
    echo ""
    echo "  setup    - Create base infra (ACR, PostgreSQL, Environment)"
    echo "  deploy   - Build images, push to ACR, create/update Container Apps"
    echo "  all      - setup + deploy in one go"
    echo "  destroy  - Delete all Azure resources"
    echo "  status   - Show deployed resources"
    echo ""
    echo "Environment variables:"
    echo "  OPENAI_API_KEY      - Required for API service"
    echo "  SCRAPINGBEE_API_KEY - Required for e-commerce product scraping"
    echo "  DB_PASSWORD         - PostgreSQL password (auto-generated if not set)"
    ;;
esac
