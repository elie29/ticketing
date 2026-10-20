#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# The root .env (shared with Compose infra mode) fills in only what the shell has not exported.
if [ -f .env ]; then
	while IFS='=' read -r name value || [ -n "$name" ]; do
		if [[ "$name" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] && [ -z "${!name+x}" ]; then
			export "$name=$value"
		fi
	done < .env
fi

export NODE_ENV=development
export JWT_KEY="${JWT_KEY:-local-development-only-change-me}"
export MONGO_USR="${MONGO_USR:-${MONGO_ROOT_USERNAME:-root}}"
export MONGO_PWD="${MONGO_PWD:-${MONGO_ROOT_PASSWORD:-local-dev-password}}"
export NATS_URL="${NATS_URL:-nats://127.0.0.1:4222}"
export REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export AUTH_API_URL="${AUTH_API_URL:-http://127.0.0.1:3001}"
export ORDERS_API_URL="${ORDERS_API_URL:-http://127.0.0.1:3002}"
export TICKETS_API_URL="${TICKETS_API_URL:-http://127.0.0.1:3003}"
export TSC_WATCHFILE=DynamicPriorityPolling
export CHOKIDAR_USEPOLLING=true

npm --prefix common run build

exec "$ROOT_DIR/node_modules/.bin/concurrently" --kill-others \
	--names common,auth,tickets,orders,expiration,client \
	"npm --prefix common run dev" \
	"env MONGO_URI=mongodb://127.0.0.1:27017/auth SERVER_PORT=3001 npm --prefix auth run dev" \
	"env MONGO_URI=mongodb://127.0.0.1:27017/tickets SERVER_PORT=3003 NATS_CLIENT=tickets-dev npm --prefix tickets run dev" \
	"env MONGO_URI=mongodb://127.0.0.1:27017/orders SERVER_PORT=3002 NATS_CLIENT=orders-dev npm --prefix orders run dev" \
	"env NATS_CLIENT=expiration-dev npm --prefix expiration run dev" \
	"npm --prefix client run dev"