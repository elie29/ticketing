#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

npm --prefix "$ROOT_DIR/common" run typecheck
npm --prefix "$ROOT_DIR/common" run test:ci

for service in auth tickets orders expiration; do
	echo "Checking and testing $service"
	npm --prefix "$ROOT_DIR/$service" run typecheck
	npm --prefix "$ROOT_DIR/$service" run test:ci "$@"
done

npm --prefix "$ROOT_DIR/client" run lint
npm --prefix "$ROOT_DIR/client" run build