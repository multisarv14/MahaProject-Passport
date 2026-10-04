#!/usr/bin/env bash
# One-time preparation of an Oracle Linux 8/9 server for Maha Passport.
# Run as root (or with sudo) from the repository directory, e.g. /opt/maha-passport.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$APP_DIR/deploy/.env.production"

echo "== Installing Docker Engine and Compose plugin"
dnf -y install dnf-plugins-core
dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
dnf -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable --now docker

echo "== Opening HTTP/HTTPS in firewalld"
if systemctl is-active --quiet firewalld; then
  firewall-cmd --permanent --add-service=http --add-service=https
  firewall-cmd --reload
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "== Creating $ENV_FILE with fresh secrets"
  read -rp "Public domain (e.g. passport.example.gov.in): " DOMAIN
  read -rp "Demo server with fictional data? (yes/no) [no]: " DEMO
  cat > "$ENV_FILE" <<EOV
SITE_ADDRESS=$DOMAIN
POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
DEMO_MODE=$([ "${DEMO:-no}" = "yes" ] && echo true || echo false)
EOV
  chmod 600 "$ENV_FILE"
fi

echo "== Building and starting containers"
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d --build

echo "== Installing daily database backup (02:30)"
mkdir -p "$APP_DIR/backups"
chmod 700 "$APP_DIR/backups"
echo "30 2 * * * root $APP_DIR/deploy/backup.sh >> /var/log/maha-passport-backup.log 2>&1" > /etc/cron.d/maha-passport-backup

echo
echo "Done. Check: docker compose -f docker-compose.prod.yml --env-file deploy/.env.production ps"
echo "If this is an OCI VM, also allow TCP 80 and 443 in the subnet's security list."
