#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

npm --prefix "$ROOT_DIR" update --ignore-scripts "$@"
npm --prefix "$ROOT_DIR/common" update "$@"
npm --prefix "$ROOT_DIR/common" run build

for service in auth tickets orders expiration client; do
	echo "Updating $service dependencies"
	npm --prefix "$ROOT_DIR/$service" update "$@"
done

echo "Packages updated. Restart affected services to load the changes."
