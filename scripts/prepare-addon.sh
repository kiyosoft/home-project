#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/apps/dashboard/dist"
WWW="$ROOT/ethio-home/www"

cd "$ROOT"

echo "Building Ethio Home packages and dashboard..."
pnpm build

if [[ ! -f "$DIST/index.html" ]]; then
  echo "error: expected $DIST/index.html after build" >&2
  exit 1
fi

echo "Syncing $DIST -> $WWW ..."
rm -rf "$WWW"
mkdir -p "$WWW"
cp -R "$DIST"/. "$WWW"/

echo "Add-on web root ready: $WWW"
echo "Commit ethio-home/www when publishing so GitHub installs include the UI."
