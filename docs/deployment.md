# Deployment

Target: one Oracle Linux 8/9 server in India (OCI Mumbai/Hyderabad region, NIC, or the State Data Centre), running Docker.

## What runs

| Container | Role | Exposed |
|---|---|---|
| `web` (Caddy) | Serves the web app, proxies `/api`, obtains and renews the HTTPS certificate, sets security headers | 80, 443 |
| `api` (Node.js) | Fastify API; applies database migrations on start | internal only |
| `db` (PostGIS 16) | Database, data in the `pgdata` volume | internal only |

## Server requirements

- 2 vCPU, 4 GB RAM, 50 GB disk is enough for the pilot (one city).
- A DNS name pointing at the server's public IP (for HTTPS).
- Inbound TCP 80 and 443 open (on OCI: the subnet security list as well as firewalld).
- Outbound HTTPS (Docker images, certificate issuance).

## First install

```bash
sudo dnf -y install git
sudo git clone <repository-url> /opt/maha-passport
cd /opt/maha-passport
sudo ./deploy/setup-oracle-linux.sh
```

The script installs Docker, opens the firewall, writes `deploy/.env.production` with generated secrets, starts the stack, and schedules a daily backup.

For a **demo server** answer `yes` to the demo question, then load the fictional data:

```bash
sudo ./deploy/load-demo-data.sh
```

## Updating

```bash
cd /opt/maha-passport
sudo git pull
sudo docker compose -f docker-compose.prod.yml --env-file deploy/.env.production up -d --build
```

Migrations run automatically when the API container starts.

## Backups and restore

Backups are written daily to `backups/` (14 days kept). Copy them off the server.

```bash
# restore a backup (stops nothing; replaces database contents)
sudo docker compose -f docker-compose.prod.yml --env-file deploy/.env.production exec -T db \
  pg_restore -U maha -d maha_passport --clean --if-exists < backups/maha_passport_YYYY-MM-DD_HHMM.dump
```

## Before real data is loaded

- [ ] `DEMO_MODE=false` in `deploy/.env.production`, then restart.
- [ ] SMS gateway connected for OTP (in `server/src/routes/auth.ts`, where the OTP is issued). Without it, nobody can sign in when demo mode is off.
- [ ] Real user accounts created with their registered mobile numbers; demo users removed.
- [ ] Security audit by a CERT-In empanelled auditor.
- [ ] Written data-sharing order from the competent authority.
- [ ] Backups copied to a second location and a restore tested.

## Health check

`https://<domain>/api/health` returns `{"ok":true}`.
