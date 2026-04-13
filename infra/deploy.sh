#!/usr/bin/env bash
# ─── Skinory Azure Deployment Script ───
# Usage:
#   First-time setup:  ./infra/deploy.sh setup
#   Deploy images:     ./infra/deploy.sh deploy [tag]
#   Full (setup+deploy): ./infra/deploy.sh all
#   Destroy everything:  ./infra/deploy.sh destroy
set -euo pipefail

# ─── Configuration ───
RESOURCE_GROUP="rg-skinory"
LOCATION="westeurope"
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

  # Ensure logged in
  if ! az account show >/dev/null 2>&1; then
    warn "Not logged into Azure. Running 'az login'..."
    az login
  fi

  ok "Pre-flight checks passed"
  log "Subscription: $(az account show --query name -o tsv)"
}

# ─── Setup: Create resource group + deploy Bicep ───
setup() {
  log "Creating resource group '${RESOURCE_GROUP}' in '${LOCATION}'..."
  az group create --name "$RESOURCE_GROUP" --location "$LOCATION" -o none
  ok "Resource group ready"

  # Prompt for secrets if not set
  if [ -z "${OPENAI_API_KEY:-}" ]; then
    read -rsp "Enter your OpenAI API key: " OPENAI_API_KEY
    echo
  fi
  if [ -z "${DB_PASSWORD:-}" ]; then
    DB_PASSWORD="Sk1nory$(openssl rand -hex 8)!"
    warn "Generated DB password (save this!): $DB_PASSWORD"
  fi

  log "Deploying Azure infrastructure via Bicep..."
  DEPLOY_OUTPUT=$(az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file "$REPO_ROOT/infra/main.bicep" \
    --parameters \
      openaiApiKey="$OPENAI_API_KEY" \
      dbPassword="$DB_PASSWORD" \
      imageTag="$IMAGE_TAG" \
    --query "properties.outputs" \
    -o json)

  ACR_NAME=$(echo "$DEPLOY_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['acrName']['value'])")
  ACR_LOGIN=$(echo "$DEPLOY_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['acrLoginServer']['value'])")
  WEB_URL=$(echo "$DEPLOY_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['webUrl']['value'])")
  LANDING_URL=$(echo "$DEPLOY_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['landingUrl']['value'])")
  API_URL=$(echo "$DEPLOY_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['apiUrl']['value'])")

  ok "Infrastructure deployed"
  echo ""
  log "ACR:     $ACR_LOGIN"
  log "Web:     $WEB_URL"
  log "Landing: $LANDING_URL"
  log "API:     $API_URL"
}

# ─── Deploy: Build and push images, update containers ───
deploy() {
  log "Getting ACR details..."
  ACR_NAME=$(az acr list -g "$RESOURCE_GROUP" --query "[0].name" -o tsv)
  ACR_LOGIN=$(az acr list -g "$RESOURCE_GROUP" --query "[0].loginServer" -o tsv)

  if [ -z "$ACR_NAME" ]; then
    err "No ACR found in '$RESOURCE_GROUP'. Run 'setup' first."
    exit 1
  fi

  log "Logging into ACR: $ACR_LOGIN"
  az acr login --name "$ACR_NAME"

  # Build and push each service
  for APP in api web landing; do
    log "Building ${APP} image..."
    docker build \
      -f "$REPO_ROOT/apps/$APP/Dockerfile" \
      -t "$ACR_LOGIN/skinory/$APP:$IMAGE_TAG" \
      -t "$ACR_LOGIN/skinory/$APP:latest" \
      "$REPO_ROOT"

    log "Pushing ${APP} image..."
    docker push "$ACR_LOGIN/skinory/$APP:$IMAGE_TAG"
    docker push "$ACR_LOGIN/skinory/$APP:latest"
    ok "$APP image pushed"
  done

  # Update container apps to new image
  for APP in api web landing; do
    log "Updating skinory-${APP} container app..."
    az containerapp update \
      --name "skinory-${APP}" \
      --resource-group "$RESOURCE_GROUP" \
      --image "$ACR_LOGIN/skinory/$APP:$IMAGE_TAG" \
      -o none 2>/dev/null || warn "skinory-${APP} update skipped (may not exist yet)"
    ok "skinory-${APP} updated"
  done

  echo ""
  ok "Deployment complete! Tag: $IMAGE_TAG"

  WEB_URL=$(az containerapp show -n skinory-web -g "$RESOURCE_GROUP" --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null || echo "")
  [ -n "$WEB_URL" ] && log "Web app: https://$WEB_URL"
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
  log "Container Apps status:"
  az containerapp list -g "$RESOURCE_GROUP" --query "[].{Name:name, Status:properties.runningStatus, URL:properties.configuration.ingress.fqdn}" -o table 2>/dev/null || warn "No resources found"
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
    echo "  setup    - Create Azure resources (RG, ACR, DB, Container Apps)"
    echo "  deploy   - Build, push, and deploy container images"
    echo "  all      - setup + deploy"
    echo "  destroy  - Delete all Azure resources"
    echo "  status   - Show running container apps"
    ;;
esac
