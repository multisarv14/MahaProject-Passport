import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import { sql, type Sql } from '../db/client.ts'
import { audit } from '../lib/audit.ts'
import { requireRole, requireUser, type SessionUser } from '../lib/auth.ts'
import { AGGREGATE_ONLY, CASE_READERS, checkTransition, type Action, type Status } from '../lib/workflow.ts'

const scope = (tx: Sql, u: SessionUser) => (u.wards ? tx`p.ward = ANY(${u.wards})` : tx`true`)

const STATS_ROLES = [...CASE_READERS, ...AGGREGATE_ONLY]

async function loadRecords(tx: Sql, propertyId: string) {
  const rows = await tx<{ source: string; data: unknown }[]>`SELECT source, data FROM source_records WHERE property_id = ${propertyId}`
  return Object.fromEntries(rows.map(r => [r.source, r.data]))
}

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message) }
}

/**
 * Runs one workflow action on a case inside a transaction:
 * locks the row, checks role / status / ward / ownership, applies the change and writes the audit entry.
 */
async function act(u: SessionUser, caseId: string, action: Action, apply: (tx: Sql, c: CaseRow, to: Status) => Promise<void>, auditText: string, detail?: object) {
  return sql.begin(async tx => {
    const [c] = await tx<CaseRow[]>`SELECT c.*, p.ward, p.owner_user_id FROM cases c JOIN properties p ON p.id = c.property_id WHERE c.id = ${caseId} FOR UPDATE OF c`
    if (!c) throw new HttpError(404, 'NOT_FOUND', 'Case not found.')
    const chk = checkTransition(action, u.role, c.status)
    if (!chk.ok) throw new HttpError(chk.code === 'FORBIDDEN_ROLE' ? 403 : 409, chk.code, chk.message)
    if (u.wards && !u.wards.includes(c.ward)) throw new HttpError(403, 'OUT_OF_SCOPE', 'This case is outside your wards.')
    if (u.role === 'inspector' && c.assigned_to !== u.id) throw new HttpError(403, 'NOT_ASSIGNED', 'This case is assigned to another inspector.')
    if (u.role === 'citizen' && c.owner_user_id !== u.id) throw new HttpError(403, 'NOT_OWNER', 'You can act only on your own property.')
    await apply(tx as unknown as Sql, c, chk.to)
    await tx`UPDATE cases SET status = ${chk.to}, updated_at = now() WHERE id = ${caseId}`
    await audit(tx as unknown as Sql, u, auditText, caseId, detail)
    return { id: caseId, status: chk.to }
  })
}

interface CaseRow {
  id: string; property_id: string; status: Status; assigned_to: string | null; est_demand: string
  approved_demand: string | null; ward: number; owner_user_id: string | null
}

const fail = (reply: FastifyReply, e: unknown) => {
  if (e instanceof HttpError) return reply.code(e.status).send({ error: e.code, message: e.message })
  throw e
}

export default async function caseRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireUser)

  app.get('/stats', { preHandler: requireRole(...STATS_ROLES) }, async req => {
    const u = req.user
    const byStatus = await sql`SELECT c.status, count(*)::int AS n, coalesce(sum(c.est_demand),0)::bigint AS est,
        coalesce(sum(c.approved_demand),0)::bigint AS approved, coalesce(sum(c.recovered),0)::bigint AS recovered
      FROM cases c JOIN properties p ON p.id = c.property_id WHERE ${scope(sql, u)} GROUP BY c.status`
    const byWard = await sql`SELECT p.ward, count(*)::int AS cases,
        count(*) FILTER (WHERE c.status IN ('suspected','assigned'))::int AS pending,
        count(*) FILTER (WHERE c.status IN ('verified','notice_sent','objection','recovered'))::int AS confirmed,
        coalesce(sum(c.approved_demand) FILTER (WHERE c.status IN ('notice_sent','objection','recovered')),0)::bigint AS demand,
        coalesce(sum(c.recovered),0)::bigint AS recovered
      FROM cases c JOIN properties p ON p.id = c.property_id WHERE ${scope(sql, u)} GROUP BY p.ward ORDER BY p.ward`
    const byRule = await sql`SELECT r AS rule, count(*)::int AS n FROM cases c JOIN properties p ON p.id = c.property_id, unnest(c.rules) r
      WHERE ${scope(sql, u)} GROUP BY r ORDER BY r`
    const [props] = await sql`SELECT count(*)::int AS n FROM properties p WHERE ${scope(sql, u)}`
    return { properties: props.n, byStatus, byWard, byRule }
  })

  app.get('/properties', { preHandler: requireRole(...CASE_READERS) }, async req => {
    const q = z.object({ q: z.string().optional(), ward: z.coerce.number().optional(), limit: z.coerce.number().max(200).default(40), offset: z.coerce.number().default(0) }).parse(req.query)
    const like = q.q ? `%${q.q}%` : null
    const rows = await sql`SELECT p.id, p.ward, p.address, p.owner_name, p.usage, p.area_sqft,
        array(SELECT DISTINCT source FROM source_records s WHERE s.property_id = p.id) AS sources,
        (SELECT json_build_object('id', c.id, 'status', c.status) FROM cases c WHERE c.property_id = p.id LIMIT 1) AS case
      FROM properties p
      WHERE ${scope(sql, req.user)}
        AND (${q.ward ?? null}::int IS NULL OR p.ward = ${q.ward ?? null})
        AND (${like}::text IS NULL OR p.id ILIKE ${like} OR p.address ILIKE ${like} OR p.owner_name ILIKE ${like})
      ORDER BY p.id LIMIT ${q.limit} OFFSET ${q.offset}`
    return rows
  })

  app.get('/properties/:id', { preHandler: requireRole(...CASE_READERS, 'citizen') }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const [p] = await sql`SELECT id, ward, address, owner_name, owner_user_id, usage, area_sqft,
        ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng FROM properties p WHERE id = ${id} AND ${scope(sql, req.user)}`
    if (!p || (req.user.role === 'citizen' && p.owner_user_id !== req.user.id)) return reply.code(404).send({ error: 'NOT_FOUND', message: 'Property not found.' })
    return { ...p, records: await loadRecords(sql, id) }
  })

  app.get('/cases', { preHandler: requireRole(...CASE_READERS) }, async req => {
    const q = z.object({
      status: z.string().optional(), rule: z.string().optional(), ward: z.coerce.number().optional(),
      mine: z.coerce.boolean().optional(), limit: z.coerce.number().max(200).default(50), offset: z.coerce.number().default(0),
    }).parse(req.query)
    const mine = q.mine || req.user.role === 'inspector' ? req.user.id : null
    return sql`SELECT c.id, c.property_id, c.rules, c.confidence, c.status, c.est_demand, c.approved_demand, c.assigned_to, c.opened_on,
        p.address, p.owner_name, p.ward, u.name AS assigned_name
      FROM cases c JOIN properties p ON p.id = c.property_id LEFT JOIN users u ON u.id = c.assigned_to
      WHERE ${scope(sql, req.user)}
        AND (${q.status ?? null}::text IS NULL OR c.status = ${q.status ?? null})
        AND (${q.rule ?? null}::text IS NULL OR ${q.rule ?? null} = ANY(c.rules))
        AND (${q.ward ?? null}::int IS NULL OR p.ward = ${q.ward ?? null})
        AND (${mine}::text IS NULL OR c.assigned_to = ${mine})
      ORDER BY c.est_demand DESC, c.id LIMIT ${q.limit} OFFSET ${q.offset}`
  })

  app.get('/cases/:id', { preHandler: requireRole(...CASE_READERS, 'citizen') }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const [c] = await sql`SELECT c.*, p.ward, p.owner_user_id FROM cases c JOIN properties p ON p.id = c.property_id WHERE c.id = ${id} AND ${scope(sql, req.user)}`
    if (!c || (req.user.role === 'citizen' && c.owner_user_id !== req.user.id)) return reply.code(404).send({ error: 'NOT_FOUND', message: 'Case not found.' })
    const [property] = await sql`SELECT id, ward, address, owner_name, usage, area_sqft FROM properties WHERE id = ${c.property_id}`
    const [visit] = await sql`SELECT v.*, u.name AS visited_by_name, ST_Y(v.gps::geometry) AS lat, ST_X(v.gps::geometry) AS lng
      FROM visits v JOIN users u ON u.id = v.visited_by WHERE case_id = ${id} ORDER BY v.id DESC LIMIT 1`
    const [objection] = await sql`SELECT * FROM objections WHERE case_id = ${id} ORDER BY id DESC LIMIT 1`
    const activity = req.user.role === 'citizen' ? [] : await sql`SELECT a.at, a.action, u.name AS who FROM audit_log a LEFT JOIN users u ON u.id = a.user_id WHERE entity = ${id} ORDER BY a.at`
    return { ...c, property, records: await loadRecords(sql, c.property_id), visit: visit ?? null, objection: objection ?? null, activity }
  })

  app.post('/cases/:id/assign', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { inspectorId } = z.object({ inspectorId: z.string() }).parse(req.body)
    try {
      return await act(req.user, id, 'assign', async (tx, c) => {
        const [i] = await tx`SELECT id, wards FROM users WHERE id = ${inspectorId} AND role = 'inspector' AND active`
        if (!i) throw new HttpError(400, 'BAD_INSPECTOR', 'Choose an active inspector.')
        if (i.wards && !i.wards.includes(c.ward)) throw new HttpError(400, 'BAD_INSPECTOR', 'This inspector does not cover the ward.')
        await tx`UPDATE cases SET assigned_to = ${inspectorId} WHERE id = ${id}`
      }, 'प्रकरण निरीक्षकाकडे सोपवले', { inspectorId })
    } catch (e) { return fail(reply, e) }
  })

  app.post('/cases/:id/visit', async (req, reply) => {
    const { id } = req.params as { id: string }
    const b = z.object({
      structureFound: z.boolean(), usageFound: z.enum(['residential', 'commercial', 'mixed']),
      measuredArea: z.number().int().min(0), photos: z.number().int().min(2, 'At least 2 photos are required.'),
      lat: z.number(), lng: z.number(), remarks: z.string().max(1000).default(''),
    }).parse(req.body)
    try {
      return await act(req.user, id, b.structureFound ? 'visit_found' : 'visit_not_found', async tx => {
        await tx`INSERT INTO visits (case_id, visited_by, visited_on, structure_found, usage_found, measured_area, photos, gps, remarks)
          VALUES (${id}, ${req.user.id}, current_date, ${b.structureFound}, ${b.usageFound}, ${b.measuredArea}, ${b.photos},
                  ${`SRID=4326;POINT(${b.lng} ${b.lat})`}, ${b.remarks})`
      }, 'प्रत्यक्ष पाहणी नोंदवली', { structureFound: b.structureFound })
    } catch (e) { return fail(reply, e) }
  })

  app.post('/cases/:id/approve', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { demand } = z.object({ demand: z.number().int().positive() }).parse(req.body)
    try {
      return await act(req.user, id, 'approve', async tx => {
        const [{ n }] = await tx`SELECT nextval('notice_no_seq') AS n`
        const noticeNo = `NOT/NMN/${new Date().getFullYear()}/${String(n).padStart(5, '0')}`
        await tx`UPDATE cases SET approved_demand = ${demand}, notice_no = ${noticeNo}, notice_date = current_date WHERE id = ${id}`
        await tx`INSERT INTO messages (case_id, channel, template, recipient) VALUES (${id}, 'SMS', 'नोटीस सूचना', 'मालमत्ताधारक'), (${id}, 'WhatsApp', 'नोटीस सूचना', 'मालमत्ताधारक')`
      }, 'आकारणी मंजूर, नोटीस पाठवली', { demand })
    } catch (e) { return fail(reply, e) }
  })

  app.post('/cases/:id/close', async (req, reply) => {
    const { id } = req.params as { id: string }
    try { return await act(req.user, id, 'close', async () => {}, 'प्रकरण बंद केले (कारवाई नाही)') } catch (e) { return fail(reply, e) }
  })

  app.post('/cases/:id/objection', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { text } = z.object({ text: z.string().min(5).max(2000) }).parse(req.body)
    try {
      return await act(req.user, id, 'file_objection', async tx => {
        await tx`INSERT INTO objections (case_id, filed_on, text, filed_by) VALUES (${id}, current_date, ${text}, ${req.user.id})`
      }, 'नागरिकाने हरकत नोंदवली')
    } catch (e) { return fail(reply, e) }
  })

  app.post('/cases/:id/objection/decision', async (req, reply) => {
    const { id } = req.params as { id: string }
    const b = z.object({ upheld: z.boolean(), note: z.string().min(3), revisedDemand: z.number().int().positive().optional() }).parse(req.body)
    try {
      return await act(req.user, id, 'decide_objection', async tx => {
        await tx`UPDATE objections SET decision = ${b.upheld ? 'upheld' : 'rejected'}, decided_on = current_date, decision_note = ${b.note}, decided_by = ${req.user.id}
          WHERE id = (SELECT max(id) FROM objections WHERE case_id = ${id})`
        if (b.upheld && b.revisedDemand) await tx`UPDATE cases SET approved_demand = ${b.revisedDemand} WHERE id = ${id}`
      }, b.upheld ? 'हरकत मान्य, मागणी सुधारली' : 'हरकत फेटाळली', b)
    } catch (e) { return fail(reply, e) }
  })

  app.post('/cases/:id/payment', async (req, reply) => {
    const { id } = req.params as { id: string }
    try {
      return await act(req.user, id, 'record_payment', async (tx, c) => {
        const amount = Number(c.approved_demand ?? 0)
        await tx`INSERT INTO payments (case_id, amount, receipt_no, recorded_by) VALUES (${id}, ${amount}, ${'RCPT-' + id + '-' + Date.now()}, ${req.user.id})`
        await tx`UPDATE cases SET recovered = ${amount} WHERE id = ${id}`
      }, 'वसुली नोंदवली')
    } catch (e) { return fail(reply, e) }
  })

  app.get('/citizen/my-property', { preHandler: requireRole('citizen') }, async req => {
    const [p] = await sql`SELECT id FROM properties WHERE owner_user_id = ${req.user.id} LIMIT 1`
    if (!p) return null
    const [c] = await sql`SELECT id FROM cases WHERE property_id = ${p.id} AND notice_no IS NOT NULL LIMIT 1`
    return { propertyId: p.id, caseId: c?.id ?? null }
  })

  app.get('/audit', { preHandler: requireRole('auditor', 'platform_admin', 'commissioner') }, async req => {
    const { limit } = z.object({ limit: z.coerce.number().max(500).default(100) }).parse(req.query)
    return sql`SELECT a.at, a.action, a.entity, a.role, u.name AS who FROM audit_log a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.at DESC, a.id DESC LIMIT ${limit}`
  })

  app.get('/inspectors', { preHandler: requireRole('ward_officer', 'assessment_officer', 'commissioner', 'platform_admin') }, async () =>
    sql`SELECT id, name, office_name AS office, wards FROM users WHERE role = 'inspector' AND active ORDER BY id`)
}
