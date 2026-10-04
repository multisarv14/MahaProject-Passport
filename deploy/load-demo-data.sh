#!/usr/bin/env bash
# Loads the fictional Namunanagar demo data. Works only when DEMO_MODE=true.
# WARNING: replaces all data in the database.
set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"
read -rp "This deletes all data and loads demo data. Type DEMO to continue: " OK
[ "$OK" = "DEMO" ] || { echo "Cancelled."; exit 1; }
docker compose -f docker-compose.prod.yml --env-file deploy/.env.production exec -T api npx tsx src/db/seed.ts
