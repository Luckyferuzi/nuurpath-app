#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

find_compose_cmd() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "docker compose"
    return 0
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
    return 0
  fi

  return 1
}

require_env_file() {
  local target="$1"

  if [[ ! -f "$target" ]]; then
    echo "Missing $target."
    echo "Copy the matching example file and provide real values before deploying."
    exit 1
  fi
}

echo "Starting NuurPath deployment..."

cd "$ROOT_DIR"

if COMPOSE_CMD="$(find_compose_cmd)"; then
  echo "Docker Compose detected. Using container deployment."
  require_env_file "$ROOT_DIR/.env"

  $COMPOSE_CMD build
  $COMPOSE_CMD up -d

  echo "Container deployment complete."
  echo "Backend should be available on http://localhost:5001"
  exit 0
fi

echo "Docker Compose not detected. Using direct Node.js deployment."

if [[ ! -f "$ROOT_DIR/server/.env" && ! -f "$ROOT_DIR/.env" ]]; then
  echo "Missing server/.env and root .env."
  echo "Copy server/.env.example to server/.env for local deployment, or provide a root .env for shared orchestration."
  exit 1
fi

echo "Installing server dependencies..."
npm --prefix server install

echo "Installing client dependencies..."
npm --prefix client install

echo "Generating Prisma client..."
(
  cd server
  npx prisma generate --schema=prisma/schema.prisma
)

echo "Applying production-safe Prisma migrations..."
(
  cd server
  npx prisma migrate deploy --schema=prisma/schema.prisma
)

echo "Building client..."
npm --prefix client run build

echo "Starting backend from server/server.js..."
npm --prefix server start
