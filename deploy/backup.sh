#!/usr/bin/env bash
# Daily PostgreSQL backup; keeps 14 days. Copy the backups folder off the server regularly.
set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$APP_DIR/backups/maha_passport_$(date +%F_%H%M).dump"
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml --env-file deploy/.env.production exec -T db \
  pg_dump -U maha -d maha_passport -Fc > "$OUT"
chmod 600 "$OUT"
find "$APP_DIR/backups" -name 'maha_passport_*.dump' -mtime +14 -delete
echo "$(date -Is) backup written: $OUT ($(du -h "$OUT" | cut -f1))"
