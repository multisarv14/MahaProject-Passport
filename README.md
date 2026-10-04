# Maha Passport (महा पासपोर्ट)

Connects department records (property tax, building permissions / OC, electricity, IGR, water) for each property, flags gaps, and runs the case workflow from site verification to notice, objection and recovery.

All data in this repository is fictional (the city "नमुनानगर" does not exist).

## Layout

| Path | What |
|---|---|
| `src/` | Web app: React + TypeScript + Vite + Tailwind |
| `server/` | API: Node.js + Fastify + PostgreSQL/PostGIS |
| `server/migrations/` | SQL schema, applied in order |
| `server/src/lib/workflow.ts` | Case lifecycle: allowed transitions and roles |
| `docs/` | Proposal presentation |

## Run locally

```bash
# 1. Database (PostGIS in Docker)
docker compose up -d db

# 2. API on :4000
cd server
cp .env.example .env        # set DEMO_MODE=true for the demo data
npm install
npm run migrate
npm run seed                # demo data; refuses to run unless DEMO_MODE=true
npm run dev

# 3. Web app on :3000
cd ..
npm install
npm run dev
```

Tests: `cd server && npm test`. Type checks: `npm run lint` in both folders.

## Security notes

- `DEMO_MODE=true` enables one-click role login and returns the OTP in the API response. It must be `false` in any real deployment.
- `audit_log` is append-only; a trigger rejects updates and deletes.
- Platform administrators cannot approve assessments or notices; only municipal officers can.
