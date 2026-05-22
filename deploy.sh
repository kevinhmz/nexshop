#!/bin/bash
set -e

IMAGE_TAG=${1:-latest}
COMPOSE_FILE="/opt/nexshop/docker-compose.prod.yml"

# Read current active port
CURRENT_PORT=$(grep -oP '\d+' /etc/nginx/conf.d/active-port.conf)

if [ "$CURRENT_PORT" = "3001" ]; then
    NEW_SERVICE="app-green"
    NEW_PORT=3002
    OLD_SERVICE="app-blue"
else
    NEW_SERVICE="app-blue"
    NEW_PORT=3001
    OLD_SERVICE="app-green"
fi

echo "=== Deploy v${IMAGE_TAG} ==="
echo "Active: port ${CURRENT_PORT} → Deploying to: ${NEW_SERVICE} (port ${NEW_PORT})"

# Pull new image
echo "Pulling image..."
export IMAGE_TAG=$IMAGE_TAG
docker compose -f $COMPOSE_FILE pull $NEW_SERVICE

# Start new service
echo "Starting ${NEW_SERVICE}..."
docker compose -f $COMPOSE_FILE up -d $NEW_SERVICE

# Wait for health check
echo "Waiting for health check..."
RETRIES=10
until curl -sf http://127.0.0.1:${NEW_PORT}/health > /dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -le 0 ]; then
        echo "ERROR: Health check failed. Rolling back."
        docker compose -f $COMPOSE_FILE stop $NEW_SERVICE
        exit 1
    fi
    echo "Waiting... (${RETRIES} retries left)"
    sleep 3
done

echo "Health check passed!"

# Switch nginx
echo "set \$active_port ${NEW_PORT};" | sudo tee /etc/nginx/conf.d/active-port.conf > /dev/null
sudo nginx -s reload

echo "Nginx switched to port ${NEW_PORT}"

# Stop old service
echo "Stopping ${OLD_SERVICE}..."
docker compose -f $COMPOSE_FILE stop $OLD_SERVICE

echo "=== Deploy complete! v${IMAGE_TAG} running on ${NEW_SERVICE} ==="