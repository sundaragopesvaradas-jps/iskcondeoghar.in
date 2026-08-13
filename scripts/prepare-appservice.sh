#!/usr/bin/env bash
# Pack Next.js standalone output for Azure App Service (Node, zip deploy).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

npm run build

rm -rf deploy
mkdir -p deploy

cp -R .next/standalone/. deploy/
mkdir -p deploy/.next
cp -R .next/static deploy/.next/static
cp -R public deploy/public

# App Service Linux sets PORT; Next standalone server.js respects it.
echo "Standalone package ready in ./deploy (start: node server.js)"
