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
| `server/src/lib/normalize.ts`, `matcher.ts` | Marathi/English address matching and link / review / new decisions |
| `server/src/lib/fields.ts` | Columns each department file must contain, header aliases, row validation |
| `public/templates/` | CSV templates per department |
| `docs/data-request-format.md` | Data format annex for the government data request (Marathi) |
| `docs/sample-data/` | Fictional sample department file for demos and tests |
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

## Department data and matching

1. **Upload** (Data Sources): CSV/XLSX → columns are matched to fields by header name (Marathi or English) → every row is checked → accepted rows are saved; rejected rows are listed with the reason.
2. **Match** (Matching): each new record is compared with existing passports by address, house number, owner name and ward.
   - score ≥ 0.80 and no close second: linked automatically
   - 0.55–0.80, or two properties nearly tied: an officer decides in the review queue
   - below 0.55: a new passport is created (for example, power connection with no tax record)
3. The rules R1–R6 are re-evaluated for every touched passport; new cases open as *suspected*. A passport created from a file without a ward must have its ward set by an assessment officer before assignment.

Try it with `docs/sample-data/msedcl_new_connections_oct2026.csv`: 14 English rows link to Marathi passports, 6 create new passports, 2 go to review, 2 are rejected.

## Security notes

- `DEMO_MODE=true` enables one-click role login and returns the OTP in the API response. It must be `false` in any real deployment.
- `audit_log` is append-only; a trigger rejects updates and deletes.
- Platform administrators cannot approve assessments or notices; only municipal officers can.
- A department data officer can upload only their own department's files and cannot run matching.
