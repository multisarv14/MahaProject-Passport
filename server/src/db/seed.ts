// Loads the fictional Namunanagar demo data into the database.
// Never run against a real deployment: it wipes the demo tables first.
import { sql } from './client.ts'
import { CITY_CODE, INITIAL_AUDIT, INITIAL_CASES, PERSONAS, PROPERTIES, PROPERTY_BY_ID, WARDS, WARD_NAMES, CITIZEN_PROPERTY_ID } from '../../../src/data/mock.ts'

if (process.env.DEMO_MODE !== 'true') {
  console.error('Refusing to seed: DEMO_MODE is not true')
  process.exit(1)
}

const lat = (y: number) => 19.0 + y / 1000
const lng = (x: number) => 74.5 + x / 1000
const point = (x: number, y: number) => `SRID=4326;POINT(${lng(x)} ${lat(y)})`

const wardsFor: Record<string, number[] | null> = {
  u_wo: [1, 2, 3, 4],
}

await sql.begin(async tx => {
  await tx`TRUNCATE integration_clients, match_reviews, matching_runs, upload_rows, messages, payments, objections, visits, cases, source_records, uploads, properties, otp_requests, users, offices RESTART IDENTITY CASCADE`
  await tx`ALTER SEQUENCE passport_no_seq RESTART WITH 1001`
  await tx`ALTER SEQUENCE case_no_seq RESTART WITH 5001`
  // audit_log rows cannot be deleted row by row; TRUNCATE is allowed for demo resets only.
  await tx`TRUNCATE audit_log RESTART IDENTITY`

  await tx`INSERT INTO offices (id, name, kind, parent_id) VALUES
    ('mh', 'महाराष्ट्र राज्य · नगरविकास विभाग', 'state', NULL),
    ('dist-namuna', 'नमुना जिल्हा', 'district', 'mh'),
    ('city-nmn', 'नमुनानगर महानगरपालिका', 'city', 'dist-namuna'),
    ('dept-msedcl', 'MSEDCL नोडल (Demo)', 'department', NULL),
    ('multisarv', 'MultiSarv सहाय्य कक्ष', 'vendor', NULL)`
  for (const w of WARDS) {
    await tx`INSERT INTO offices (id, name, kind, parent_id) VALUES (${'ward-' + w}, ${`प्रभाग ${w} · ${WARD_NAMES[w]}`}, 'ward', 'city-nmn')`
  }

  const officeOf: Record<string, string> = {
    platform_admin: 'multisarv', state_lead: 'mh', collector: 'dist-namuna', dept_data_officer: 'dept-msedcl',
  }
  let i = 9
  for (const p of PERSONAS) {
    i++
    await tx`INSERT INTO users (id, name, mobile, role, office_id, office_name, wards, data_source)
      VALUES (${p.id}, ${p.name}, ${p.id === 'u_comm' && process.env.DEMO_MOBILE ? process.env.DEMO_MOBILE : '90000000' + i}, ${p.role}, ${officeOf[p.role] ?? 'city-nmn'}, ${p.office}, ${wardsFor[p.id] ?? null}, ${p.id === 'u_do' ? 'elec' : null})`
  }

  const rows = PROPERTIES.map(p => ({
    id: p.id, city_code: CITY_CODE, ward: p.ward, address: p.address, owner_name: p.owner,
    owner_user_id: p.id === CITIZEN_PROPERTY_ID ? 'u_cit' : null, usage: p.usage, area_sqft: p.area, location: point(p.x, p.y),
  }))
  await tx`INSERT INTO properties ${tx(rows)}`

  const recs: { source: string; ref_no: string; property_id: string; data: object; address?: string; name?: string; ward?: number }[] = []
  for (const p of PROPERTIES) {
    if (p.tax) recs.push({ source: 'tax', ref_no: p.tax.taxNo + '#' + p.id.slice(-6), property_id: p.id, data: p.tax })
    if (p.oc) recs.push({ source: 'oc', ref_no: p.oc.ocNo + '#' + p.id.slice(-6), property_id: p.id, data: p.oc })
    if (p.elec) recs.push({ source: 'elec', ref_no: p.elec.consumerNo + '#' + p.id.slice(-6), property_id: p.id, data: p.elec })
    if (p.igr) recs.push({ source: 'igr', ref_no: p.igr.docNo + '#' + p.id.slice(-6), property_id: p.id, data: p.igr })
    if (p.water) recs.push({ source: 'water', ref_no: p.water.connNo + '#' + p.id.slice(-6), property_id: p.id, data: p.water })
  }
  for (const r of recs) { const p = PROPERTY_BY_ID[r.property_id]; r.address = p.address; r.ward = p.ward; r.name = p.owner }
  for (let k = 0; k < recs.length; k += 500) {
    await tx`INSERT INTO source_records ${tx(recs.slice(k, k + 500).map(r => ({ ...r, data: tx.json(r.data as never), match_status: 'linked', match_score: 1 })))}`
  }

  for (const c of INITIAL_CASES) {
    await tx`INSERT INTO cases (id, property_id, rules, confidence, status, est_demand, approved_demand, recovered, assigned_to, opened_on, notice_no, notice_date)
      VALUES (${c.id}, ${c.propertyId}, ${c.rules}, ${c.confidence}, ${c.status}, ${c.estDemand}, ${c.approvedDemand ?? null}, ${c.recovered ?? null},
              ${c.assignedTo ?? null}, ${c.openedOn}, ${c.noticeNo ?? null}, ${c.noticeDate ?? null})`
    if (c.visit) {
      const p = PROPERTY_BY_ID[c.propertyId]
      await tx`INSERT INTO visits (case_id, visited_by, visited_on, structure_found, usage_found, measured_area, photos, gps, remarks)
        VALUES (${c.id}, ${c.visit.by}, ${c.visit.date}, ${c.visit.exists}, ${c.visit.usageFound}, ${c.visit.measuredArea}, ${c.visit.photos}, ${point(p.x, p.y)}, ${c.visit.remarks})`
    }
    if (c.objection) {
      await tx`INSERT INTO objections (case_id, filed_on, text) VALUES (${c.id}, ${c.objection.date}, ${c.objection.text})`
    }
    if (c.status === 'recovered' && c.recovered) {
      // Paid a few days after the notice, never in the future
      const paid = new Date(new Date(c.noticeDate + 'T11:00:00+05:30').getTime() + (3 + (c.recovered % 9)) * 86_400_000)
      const paidAt = paid.getTime() > Date.now() ? new Date() : paid
      await tx`INSERT INTO payments (case_id, amount, receipt_no, recorded_by, paid_at) VALUES (${c.id}, ${c.recovered}, ${'RCPT-' + c.id}, 'u_rc', ${paidAt})`
      await tx`UPDATE cases SET updated_at = ${paidAt} WHERE id = ${c.id}`
    }
  }

  for (const a of [...INITIAL_AUDIT].reverse()) {
    await tx`INSERT INTO audit_log (at, user_id, role, action, entity) VALUES (${a.at + ':00+05:30'}, ${a.who}, ${a.role}, ${a.action}, ${a.entity})`
  }
})

const [{ p }] = await sql`SELECT count(*)::int AS p FROM properties`
const [{ c }] = await sql`SELECT count(*)::int AS c FROM cases`
const [{ r }] = await sql`SELECT count(*)::int AS r FROM source_records`
console.log(`seeded: ${p} properties, ${r} department records, ${c} cases, ${PERSONAS.length} users`)
await sql.end()
