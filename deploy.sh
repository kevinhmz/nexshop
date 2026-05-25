#!/usr/bin/env bash
set -euo pipefail

NEW_IMAGE="${1:-}"

APP_DIR="/opt/nexshop"
COMPOSE_FILE="${APP_DIR}/docker-compose.prod.yml"
DEPLOY_ENV="${APP_DIR}/.env.deploy"
ACTIVE_PROXY_FILE="${APP_DIR}/nginx-active-proxy.conf"
RUNTIME_ENV="${APP_DIR}/.env.runtime"
HEALTH_PATH="${HEALTH_PATH:-/health}"

if [ -z "$NEW_IMAGE" ]; then
  echo "Usage: ./deploy.sh <full-image>"
  echo "Example: ./deploy.sh ghcr.io/kevinhmz/nexshop:a8f31c2"
  exit 1
fi

cd "$APP_DIR"

exec 9>/tmp/nexshop-deploy.lock
if ! flock -n 9; then
  echo "Another deployment is already running."
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Missing compose file: $COMPOSE_FILE"
  exit 1
fi

if [ ! -f "$DEPLOY_ENV" ]; then
  echo "Missing deploy env file: $DEPLOY_ENV"
  exit 1
fi

get_env_value() {
  grep -E "^$1=" "$DEPLOY_ENV" | cut -d "=" -f2-
}

set_env_value() {
  KEY="$1"
  VALUE="$2"

  if grep -qE "^${KEY}=" "$DEPLOY_ENV"; then
    sed -i.bak "s|^${KEY}=.*|${KEY}=${VALUE}|" "$DEPLOY_ENV"
  else
    echo "${KEY}=${VALUE}" >> "$DEPLOY_ENV"
  fi
}

ACTIVE_COLOR="$(get_env_value ACTIVE_COLOR || true)"

if [ "$ACTIVE_COLOR" = "blue" ]; then
  NEW_COLOR="green"
  OLD_COLOR="blue"
  NEW_SERVICE="app-green"
  OLD_SERVICE="app-blue"
  NEW_PORT="3002"
  IMAGE_KEY="APP_IMAGE_GREEN"
elif [ "$ACTIVE_COLOR" = "green" ]; then
  NEW_COLOR="blue"
  OLD_COLOR="green"
  NEW_SERVICE="app-blue"
  OLD_SERVICE="app-green"
  NEW_PORT="3001"
  IMAGE_KEY="APP_IMAGE_BLUE"
else
  echo "Invalid ACTIVE_COLOR in $DEPLOY_ENV. Expected: blue or green."
  exit 1
fi

echo "=== Nexshop blue-green deploy ==="
echo "Current active color: $ACTIVE_COLOR"
echo "Deploying to color: $NEW_COLOR"
echo "New service: $NEW_SERVICE"
echo "Old service: $OLD_SERVICE"
echo "New port: $NEW_PORT"
echo "New image: $NEW_IMAGE"

echo "Updating ${IMAGE_KEY} in .env.deploy..."
set_env_value "$IMAGE_KEY" "$NEW_IMAGE"

echo "Validating Docker Compose config..."
docker compose --env-file "$DEPLOY_ENV" -f "$COMPOSE_FILE" config > /dev/null

echo "Ensuring db and redis are running..."
docker compose --env-file "$DEPLOY_ENV" -f "$COMPOSE_FILE" up -d db redis

echo "Pulling new image for $NEW_SERVICE..."
docker compose --env-file "$DEPLOY_ENV" -f "$COMPOSE_FILE" pull "$NEW_SERVICE"

echo "Running migrations..."
if ! docker compose \
  --env-file "$DEPLOY_ENV" \
  --env-file "$RUNTIME_ENV" \
  -f "$COMPOSE_FILE" \
  run --rm --no-deps "$NEW_SERVICE" npx prisma migrate deploy; then

  echo "ERROR: Migration failed. Aborting deploy."
  exit 1
fi

echo "Starting $NEW_SERVICE..."
docker compose --env-file "$DEPLOY_ENV" -f "$COMPOSE_FILE" up -d --no-deps "$NEW_SERVICE"

echo "Waiting for healthcheck: http://127.0.0.1:${NEW_PORT}${HEALTH_PATH}"

HEALTH_OK="false"

for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${NEW_PORT}${HEALTH_PATH}" > /dev/null; then
    HEALTH_OK="true"
    break
  fi

  echo "Waiting... attempt $i/30"
  sleep 2
done

if [ "$HEALTH_OK" != "true" ]; then
  echo "ERROR: Healthcheck failed for $NEW_SERVICE"
  echo "Showing logs:"
  docker compose --env-file "$DEPLOY_ENV" -f "$COMPOSE_FILE" logs --tail=100 "$NEW_SERVICE"

  echo "Stopping failed service: $NEW_SERVICE"
  docker compose --env-file "$DEPLOY_ENV" -f "$COMPOSE_FILE" stop "$NEW_SERVICE" || true

  exit 1
fi

echo "Healthcheck passed."

echo "Switching Nginx to $NEW_COLOR on port $NEW_PORT..."

if [ -f "$ACTIVE_PROXY_FILE" ]; then
  cp "$ACTIVE_PROXY_FILE" "${ACTIVE_PROXY_FILE}.bak"
fi

echo "proxy_pass http://127.0.0.1:${NEW_PORT};" > "$ACTIVE_PROXY_FILE"

if ! sudo nginx -t; then
  echo "ERROR: Nginx config test failed. Restoring previous config."

  if [ -f "${ACTIVE_PROXY_FILE}.bak" ]; then
    cp "${ACTIVE_PROXY_FILE}.bak" "$ACTIVE_PROXY_FILE"
  fi

  sudo nginx -t || true
  exit 1
fi

sudo nginx -s reload

echo "Nginx switched successfully."

echo "Updating ACTIVE_COLOR to $NEW_COLOR..."
set_env_value "ACTIVE_COLOR" "$NEW_COLOR"

echo "Stopping old service: $OLD_SERVICE"
docker compose --env-file "$DEPLOY_ENV" -f "$COMPOSE_FILE" stop "$OLD_SERVICE" || true

echo "Cleaning dangling Docker images..."
docker image prune -f || true

echo "=== Deploy completed successfully ==="
echo "Active color: $NEW_COLOR"
echo "Running image: $NEW_IMAGE"