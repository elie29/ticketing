#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

npm --prefix "$ROOT_DIR" ci --ignore-scripts "$@"
npm --prefix "$ROOT_DIR/backend/common" ci "$@"
npm --prefix "$ROOT_DIR/backend/common" run build

for service in backend/auth backend/tickets backend/orders backend/expiration client; do
	echo "Installing $service dependencies"
	npm --prefix "$ROOT_DIR/$service" ci "$@"
done
