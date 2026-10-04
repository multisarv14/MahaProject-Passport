import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import ExcelJS from 'exceljs'
import { parse as parseCsv } from 'csv-parse/sync'
import { sql, type Sql } from '../db/client.ts'
import { audit } from '../lib/audit.ts'
import { requireRole, requireUser, type SessionUser } from '../lib/auth.ts'
import { FIELDS, REF_FIELD, coerceRow, suggestMapping, type Source } from '../lib/fields.ts'
import { CandidateIndex, decide, prepare } from '../lib/matcher.ts'
import { confidenceFor, estimateDemand, rulesFor } from '../../../src/lib/rules.ts'
import type { Property, Usage } from '../../../src/data/types.ts'

const SOURCES = ['tax', 'oc', 'elec', 'igr', 'water'] as const
const MAX_ROWS = 200_000
const UPLOADERS = ['assessment_officer', 'commissioner', 'dept_data_officer'] as const
const MATCHERS = ['assessment_officer', 'commissioner'] as const
const CITY_CODE = 'NMN'

class HttpError extends Error { constructor(public status: number, public code: string, message: string) { super(message) } }
const fail = (reply: FastifyReply, e: unknown) => {
  if (e instanceof HttpError) return reply.code(e.status).send({ error: e.code, message: e.message })
  throw e
}

async function allowedSource(u: SessionUser, source: Source) {
  if (u.role !== 'dept_data_officer') return
  const [row] = await sql`SELECT data_source FROM users WHERE id = ${u.id}`
  if (row?.data_source !== source) throw new HttpError(403, 'WRONG_SOURCE', 'You can upload only your own department\'s files.')
}

/** Reads a CSV or XLSX buffer into header names and string-valued rows. */
async function readTable(fileName: string, buf: Buffer): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  if (/\.csv$/i.test(fileName)) {
    const rows = parseCsv(buf, { columns: (h: string[]) => h.map(x => x.trim()), bom: true, skip_empty_lines: true, relax_column_count: true, trim: true }) as Record<string, string>[]
    return { headers: rows.length ? Object.keys(rows[0]) : [], rows }
  }
  if (/\.xlsx$/i.test(fileName)) {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf as unknown as ArrayBuffer)
    const ws = wb.worksheets[0]
    if (!ws) return { headers: [], rows: [] }
    const cell = (v: ExcelJS.CellValue): string => {
      if (v === null || v === undefined) return ''
      if (v instanceof Date) return v.toISOString().slice(0, 10)
      if (typeof v === 'object' && 'text' in v) return String(v.text)
      if (typeof v === 'object' && 'result' in v) return String(v.result ?? '')
      if (typeof v === 'object' && 'richText' in v) return v.richText.map(r => r.text).join('')
      return String(v)
    }
    const headers = (ws.getRow(1).values as ExcelJS.CellValue[]).slice(1).map(v => cell(v).trim())
    const rows: Record<string, string>[] = []
    ws.eachRow((row, n) => {
      if (n === 1) return
      const vals = (row.values as ExcelJS.CellValue[]).slice(1)
      const r: Record<string, string> = {}
      headers.forEach((h, i) => { r[h] = cell(vals[i]).trim() })
      if (Object.values(r).some(Boolean)) rows.push(r)
    })
    return { headers, rows }
  }
  throw new HttpError(400, 'BAD_FILE', 'Upload a .csv or .xlsx file.')
}

async function stagedRows(id: number) {
  const rows = await sql<{ row_no: number; raw: Record<string, string> }[]>`SELECT row_no, raw FROM upload_rows WHERE upload_id = ${id} ORDER BY row_no`
  return rows
}

function validate(source: Source, rows: { row_no: number; raw: Record<string, string> }[], mapping: Record<string, string | null>) {
  const ok: { row_no: number; data: Record<string, unknown> }[] = []
  const bad: { row_no: number; errors: string[] }[] = []
  const seen = new Set<string>()
  for (const r of rows) {
    const res = coerceRow(source, r.raw, mapping)
    const ref = res.data?.[REF_FIELD[source]] as string | undefined
    if (res.ok && ref && seen.has(ref)) { bad.push({ row_no: r.row_no, errors: [`क्रमांक ${ref} या file मध्ये दोनदा आहे`] }); continue }
    if (ref) seen.add(ref)
    if (res.ok) ok.push({ row_no: r.row_no, data: res.data! })
    else bad.push({ row_no: r.row_no, errors: res.errors })
  }
  return { ok, bad }
}

const mappingSchema = z.object({ mapping: z.record(z.string(), z.string().nullable()) })

/** Builds the Property view of one passport from its linked records and re-evaluates its case. */
async function refreshCase(tx: Sql, propertyId: string, matchScore: number, u: SessionUser): Promise<'opened' | 'updated' | null> {
  const [p] = await tx<{ id: string; usage: Usage; area_sqft: number }[]>`SELECT id, usage, area_sqft FROM properties WHERE id = ${propertyId}`
  const recs = await tx<{ source: Source; data: Record<string, unknown> }[]>`
    SELECT DISTINCT ON (source) source, data FROM source_records WHERE property_id = ${propertyId} ORDER BY source, created_at DESC`
  const view = { usage: p.usage, area: p.area_sqft } as Pick<Property, 'usage' | 'area' | 'tax' | 'oc' | 'elec' | 'igr' | 'water'>
  for (const r of recs) (view as Record<string, unknown>)[r.source] = r.data
  const rules = rulesFor(view)
  const [open] = await tx<{ id: string; status: string }[]>`SELECT id, status FROM cases WHERE property_id = ${propertyId} AND status NOT IN ('closed', 'not_found') ORDER BY opened_on DESC LIMIT 1`
  if (!rules.length) return null
  const est = estimateDemand(view, rules)
  if (open) {
    if (open.status !== 'suspected') return null
    await tx`UPDATE cases SET rules = ${rules}, est_demand = ${est}, confidence = ${confidenceFor(rules, matchScore)}, updated_at = now() WHERE id = ${open.id}`
    return 'updated'
  }
  const [{ n }] = await tx`SELECT nextval('case_no_seq') AS n`
  const id = `C-${CITY_CODE}-${n}`
  await tx`INSERT INTO cases (id, property_id, rules, confidence, status, est_demand) VALUES (${id}, ${propertyId}, ${rules}, ${confidenceFor(rules, matchScore)}, 'suspected', ${est})`
  await audit(tx, u, 'जुळवणीतून नवीन प्रकरण उघडले', id, { rules })
  return 'opened'
}

async function createPassport(tx: Sql, rec: { source: Source; data: Record<string, unknown>; address: string; name: string | null; ward: number | null }) {
  const [{ n }] = await tx`SELECT nextval('passport_no_seq') AS n`
  const id = `MP-MH-${CITY_CODE}-2026-${String(n).padStart(6, '0')}`
  const d = rec.data
  const usage: Usage = (d.usage as Usage) ?? (d.category === 'LT-II व्यावसायिक' ? 'commercial' : 'residential')
  const area = Number(d.assessedArea ?? d.builtUpArea ?? 0)
  await tx`INSERT INTO properties (id, city_code, ward, address, owner_name, usage, area_sqft)
    VALUES (${id}, ${CITY_CODE}, ${rec.ward ?? 0}, ${rec.address}, ${rec.name ?? '—'}, ${usage}, ${area})`
  return { id, ward: rec.ward ?? 0, address: rec.address, owner: rec.name ?? undefined }
}

export default async function ingestRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireUser)

  app.get('/fields/:source', async (req, reply) => {
    const { source } = req.params as { source: Source }
    if (!SOURCES.includes(source)) return reply.code(404).send({ error: 'NOT_FOUND' })
    return FIELDS[source].map(({ key, label, required, kind }) => ({ key, label, required, kind }))
  })

  app.get('/uploads', { preHandler: requireRole(...UPLOADERS) }, async () =>
    sql`SELECT u.id, u.source, u.file_name, u.status, u.rows_total, u.rows_ok, u.rows_rejected, u.quality_pct, u.uploaded_at, us.name AS uploaded_by
      FROM uploads u LEFT JOIN users us ON us.id = u.uploaded_by WHERE u.status <> 'discarded' ORDER BY u.uploaded_at DESC LIMIT 50`)

  // Step 1: receive the file, stage its rows, and suggest a column mapping.
  app.post('/uploads', { preHandler: requireRole(...UPLOADERS) }, async (req, reply) => {
    try {
      const parts = req.parts()
      let source: Source | null = null
      let file: { name: string; buf: Buffer } | null = null
      for await (const part of parts) {
        if (part.type === 'file') file = { name: part.filename, buf: await part.toBuffer() }
        else if (part.fieldname === 'source') source = String(part.value) as Source
      }
      if (!source || !SOURCES.includes(source)) throw new HttpError(400, 'BAD_SOURCE', 'Choose the department this file belongs to.')
      if (!file) throw new HttpError(400, 'NO_FILE', 'Attach a .csv or .xlsx file.')
      await allowedSource(req.user, source)
      const { headers, rows } = await readTable(file.name, file.buf)
      if (!rows.length) throw new HttpError(400, 'EMPTY_FILE', 'The file has no data rows.')
      if (rows.length > MAX_ROWS) throw new HttpError(400, 'TOO_MANY_ROWS', `Split the file: at most ${MAX_ROWS} rows per upload.`)
      const mapping = suggestMapping(source, headers)
      const id = await sql.begin(async tx => {
        const [u] = await tx`INSERT INTO uploads (source, file_name, records, uploaded_by, status, headers, mapping, rows_total)
          VALUES (${source}, ${file!.name}, 0, ${req.user.id}, 'staged', ${tx.json(headers)}, ${tx.json(mapping as never)}, ${rows.length}) RETURNING id`
        for (let i = 0; i < rows.length; i += 1000) {
          await tx`INSERT INTO upload_rows ${tx(rows.slice(i, i + 1000).map((raw, k) => ({ upload_id: u.id, row_no: i + k + 2, raw: tx.json(raw) })))}`
        }
        return Number(u.id)
      })
      return { id, source, fileName: file.name, headers, mapping, total: rows.length, sample: rows.slice(0, 8), fields: FIELDS[source].map(({ key, label, required }) => ({ key, label, required })) }
    } catch (e) { return fail(reply, e) }
  })

  // Step 2: check every row against a mapping without writing anything.
  app.post('/uploads/:id/validate', { preHandler: requireRole(...UPLOADERS) }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    const { mapping } = mappingSchema.parse(req.body)
    const [u] = await sql`SELECT source, status, uploaded_by FROM uploads WHERE id = ${id}`
    if (!u || u.status !== 'staged') return reply.code(404).send({ error: 'NOT_FOUND', message: 'No staged upload with this id.' })
    const missing = FIELDS[u.source as Source].filter(f => f.required && !mapping[f.key]).map(f => f.label)
    const { ok, bad } = validate(u.source, await stagedRows(id), mapping)
    return { ok: ok.length, rejected: bad.length, missingFields: missing, errors: bad.slice(0, 50) }
  })

  // Step 3: write valid rows as department records; they wait for the next matching run.
  app.post('/uploads/:id/commit', { preHandler: requireRole(...UPLOADERS) }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    const { mapping } = mappingSchema.parse(req.body)
    try {
      return await sql.begin(async tx => {
        const [u] = await tx`SELECT source, status FROM uploads WHERE id = ${id} FOR UPDATE`
        if (!u || u.status !== 'staged') throw new HttpError(409, 'NOT_STAGED', 'This upload was already committed or discarded.')
        await allowedSource(req.user, u.source)
        const missing = FIELDS[u.source as Source].filter(f => f.required && !mapping[f.key])
        if (missing.length) throw new HttpError(400, 'MAPPING_INCOMPLETE', `Map the required columns: ${missing.map(f => f.label).join(', ')}`)
        const rows = await tx<{ row_no: number; raw: Record<string, string> }[]>`SELECT row_no, raw FROM upload_rows WHERE upload_id = ${id} ORDER BY row_no`
        const { ok, bad } = validate(u.source, rows, mapping)
        const ref = REF_FIELD[u.source as Source]
        let inserted = 0, updated = 0
        for (let i = 0; i < ok.length; i += 500) {
          const batch = ok.slice(i, i + 500).map(r => ({
            source: u.source, ref_no: String(r.data[ref]), data: tx.json(r.data as never), upload_id: id,
            address: String(r.data.address ?? ''), name: (r.data.owner ?? r.data.name ?? r.data.buyer ?? null) as string | null,
            ward: (r.data.ward ?? null) as number | null, match_status: 'pending',
          }))
          const res = await tx`INSERT INTO source_records ${tx(batch)}
            ON CONFLICT (source, ref_no) DO UPDATE SET data = EXCLUDED.data, upload_id = EXCLUDED.upload_id, address = EXCLUDED.address, name = EXCLUDED.name, ward = EXCLUDED.ward
            RETURNING (xmax = 0) AS inserted`
          for (const r of res) r.inserted ? inserted++ : updated++
        }
        const quality = rows.length ? Math.round((ok.length / rows.length) * 100) : 0
        await tx`UPDATE uploads SET status = 'committed', mapping = ${tx.json(mapping as never)}, records = ${ok.length}, rows_ok = ${ok.length}, rows_rejected = ${bad.length}, quality_pct = ${quality} WHERE id = ${id}`
        await tx`DELETE FROM upload_rows WHERE upload_id = ${id}`
        await audit(tx as unknown as Sql, req.user, 'विभागाचा data upload केला', `UPLOAD-${id}`, { source: u.source, ok: ok.length, rejected: bad.length })
        return { id, inserted, updated, rejected: bad.length, quality, errors: bad.slice(0, 50) }
      })
    } catch (e) { return fail(reply, e) }
  })

  app.post('/uploads/:id/discard', { preHandler: requireRole(...UPLOADERS) }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    const [u] = await sql`UPDATE uploads SET status = 'discarded' WHERE id = ${id} AND status = 'staged' RETURNING id`
    if (!u) return reply.code(404).send({ error: 'NOT_FOUND', message: 'No staged upload with this id.' })
    await sql`DELETE FROM upload_rows WHERE upload_id = ${id}`
    return { id, status: 'discarded' }
  })

  app.get('/matching/summary', { preHandler: requireRole(...MATCHERS) }, async () => {
    const [p] = await sql`SELECT count(*) FILTER (WHERE property_id IS NULL AND match_status = 'pending')::int AS pending,
      count(*) FILTER (WHERE match_status = 'review')::int AS review FROM source_records`
    const runs = await sql`SELECT r.*, u.name AS run_by_name FROM matching_runs r LEFT JOIN users u ON u.id = r.run_by ORDER BY run_at DESC LIMIT 10`
    return { pending: p.pending, review: p.review, runs }
  })

  // Links every pending record to a passport (or queues it for an officer), then re-evaluates the rules.
  app.post('/matching/run', { preHandler: requireRole(...MATCHERS) }, async req => {
    return sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(4242)` // one run at a time
      const props = await tx<{ id: string; ward: number; address: string; owner_name: string }[]>`SELECT id, ward, address, owner_name FROM properties`
      const index = new CandidateIndex()
      for (const p of props) index.add(prepare({ id: p.id, ward: p.ward, address: p.address, owner: p.owner_name }))
      const pending = await tx<{ id: string; source: Source; data: Record<string, unknown>; address: string; name: string | null; ward: number | null }[]>`
        SELECT id, source, data, address, name, ward FROM source_records WHERE property_id IS NULL AND match_status = 'pending'
        ORDER BY array_position(ARRAY['tax','oc','elec','water','igr'], source), id`
      const touched = new Map<string, number>()
      let linked = 0, created = 0, review = 0
      for (const r of pending) {
        const d = decide({ address: r.address, name: r.name ?? undefined, ward: r.ward }, index)
        if (d.kind === 'link') {
          await tx`UPDATE source_records SET property_id = ${d.propertyId}, match_status = 'linked', match_score = ${d.score} WHERE id = ${r.id}`
          touched.set(d.propertyId, Math.min(touched.get(d.propertyId) ?? 1, d.score)); linked++
        } else if (d.kind === 'review') {
          await tx`UPDATE source_records SET match_status = 'review', match_score = ${d.score} WHERE id = ${r.id}`
          await tx`INSERT INTO match_reviews (record_id, candidate_id, runner_up_id, score, runner_up_score)
            VALUES (${r.id}, ${d.propertyId}, ${d.runnerUp?.propertyId ?? null}, ${d.score}, ${d.runnerUp?.score ?? null})`
          review++
        } else {
          const p = await createPassport(tx as unknown as Sql, r)
          index.add(prepare(p))
          await tx`UPDATE source_records SET property_id = ${p.id}, match_status = 'new', match_score = ${d.bestScore} WHERE id = ${r.id}`
          touched.set(p.id, 0.9); created++
        }
      }
      let opened = 0, updatedCases = 0
      for (const [pid, s] of touched) {
        const r = await refreshCase(tx as unknown as Sql, pid, s, req.user)
        if (r === 'opened') opened++
        if (r === 'updated') updatedCases++
      }
      const result = { processed: pending.length, linked, created, toReview: review, casesOpened: opened, casesUpdated: updatedCases }
      await tx`INSERT INTO matching_runs (run_by, processed, linked, created, to_review, cases_opened, cases_updated)
        VALUES (${req.user.id}, ${pending.length}, ${linked}, ${created}, ${review}, ${opened}, ${updatedCases})`
      await audit(tx as unknown as Sql, req.user, 'जुळवणी चालवली', 'MATCHING', result)
      return result
    })
  })

  app.get('/matching/reviews', { preHandler: requireRole(...MATCHERS) }, async () =>
    sql`SELECT m.id, m.score, m.runner_up_score, s.source, s.address AS record_address, s.name AS record_name, s.ref_no, s.data,
        c.id AS candidate_id, c.address AS candidate_address, c.owner_name AS candidate_owner, c.ward AS candidate_ward,
        r.id AS runner_up_id, r.address AS runner_up_address, r.owner_name AS runner_up_owner
      FROM match_reviews m JOIN source_records s ON s.id = m.record_id JOIN properties c ON c.id = m.candidate_id
      LEFT JOIN properties r ON r.id = m.runner_up_id
      WHERE m.status = 'pending' ORDER BY m.score DESC LIMIT 200`)

  // An officer settles an uncertain match: link to one of the suggested properties, or open a new passport.
  app.post('/matching/reviews/:id', { preHandler: requireRole(...MATCHERS) }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    const b = z.object({ decision: z.enum(['link', 'new']), propertyId: z.string().optional() }).parse(req.body)
    try {
      return await sql.begin(async tx => {
        const [m] = await tx`SELECT m.*, s.source, s.data, s.address, s.name, s.ward FROM match_reviews m JOIN source_records s ON s.id = m.record_id WHERE m.id = ${id} FOR UPDATE OF m`
        if (!m || m.status !== 'pending') throw new HttpError(409, 'ALREADY_DECIDED', 'This match has already been decided.')
        let pid: string
        if (b.decision === 'link') {
          pid = b.propertyId ?? m.candidate_id
          if (![m.candidate_id, m.runner_up_id].includes(pid)) throw new HttpError(400, 'BAD_PROPERTY', 'Choose one of the suggested properties.')
          await tx`UPDATE source_records SET property_id = ${pid}, match_status = 'linked' WHERE id = ${m.record_id}`
        } else {
          pid = (await createPassport(tx as unknown as Sql, m as never)).id
          await tx`UPDATE source_records SET property_id = ${pid}, match_status = 'new' WHERE id = ${m.record_id}`
        }
        await tx`UPDATE match_reviews SET status = ${b.decision === 'link' ? 'linked' : 'new'}, decided_by = ${req.user.id}, decided_at = now() WHERE id = ${id}`
        await audit(tx as unknown as Sql, req.user, b.decision === 'link' ? 'जुळवणी पडताळून नोंद जोडली' : 'जुळवणी पडताळून नवीन Passport तयार केला', pid, { review: id })
        const caseResult = await refreshCase(tx as unknown as Sql, pid, 1, req.user)
        return { id, propertyId: pid, case: caseResult }
      })
    } catch (e) { return fail(reply, e) }
  })
}
