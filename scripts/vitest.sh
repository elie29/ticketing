#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Root and client suites only; packages run their own projects with their own Vitest.
exec "$ROOT_DIR/node_modules/.bin/vitest" run --project root --project client "$@"