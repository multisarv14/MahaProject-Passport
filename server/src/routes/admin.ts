// Platform administration: users, offices, system health and the admin's own audit trail.
// Nothing here returns property, case or citizen data.
import { createHash, randomBytes } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sql, type Sql } from '../db/client.ts'
import { audit } from '../lib/audit.ts'
import { requireRole, requireUser } from '../lib/auth.ts'

const STAFF_ROLES = [
  'platform_admin', 'state_lead', 'collector', 'commissioner', 'assessment_officer', 'ward_officer', 'inspector',
  'hearing_officer', 'recovery_clerk', 'dept_data_officer', 'auditor', 'representative', 'business_officer',
] as const
const SOURCES = ['tax', 'oc', 'elec', 'igr', 'water'] as const
const VERSION = JSON.parse(readFileSync(join(import.meta.dirname, '../../package.json'), 'utf8')).version as string

const userBody = z.object({
  name: z.string().trim().min(2).max(100),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile number must be 10 digits'),
  role: z.enum(STAFF_ROLES),
  officeName: z.string().trim().min(2).max(200),
  officeId: z.string().nullable().optional(),
  wards: z.array(z.number().int().min(1).max(99)).nullable().optional(),
  dataSource: z.enum(SOURCES).nullable().optional(),
})

export default async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireUser)
  app.addHook('preHandler', requireRole('platform_admin'))

  app.get('/admin/users', async () => sql`
    SELECT u.id, u.name, u.mobile, u.role, u.office_id, u.office_name, u.wards, u.data_source, u.active, u.created_at,
      (SELECT max(a.at) FROM audit_log a WHERE a.user_id = u.id AND a.action = 'प्रवेश (login)') AS last_login
    FROM users u WHERE u.role <> 'citizen' ORDER BY u.active DESC, u.role, u.name`)

  app.post('/admin/users', async (req, reply) => {
    const b = userBody.parse(req.body)
    if (b.role === 'dept_data_officer' && !b.dataSource) return reply.code(400).send({ error: 'DATA_SOURCE_REQUIRED', message: 'Choose the department whose files this officer uploads.' })
    const [dup] = await sql`SELECT id FROM users WHERE mobile = ${b.mobile}`
    if (dup) return reply.code(409).send({ error: 'MOBILE_TAKEN', message: 'Another user already has this mobile number.' })
    const id = 'u_' + randomBytes(5).toString('hex')
    await sql.begin(async tx => {
      await tx`INSERT INTO users (id, name, mobile, role, office_id, office_name, wards, data_source)
        VALUES (${id}, ${b.name}, ${b.mobile}, ${b.role}, ${b.officeId ?? null}, ${b.officeName}, ${b.wards?.length ? b.wards : null}, ${b.role === 'dept_data_officer' ? b.dataSource! : null})`
      await audit(tx as unknown as Sql, req.user, 'नवीन user तयार केला', id, { role: b.role, office: b.officeName })
    })
    return { id }
  })

  app.patch('/admin/users/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const b = userBody.partial().extend({ active: z.boolean().optional() }).parse(req.body)
    if (id === req.user.id && (b.active === false || (b.role && b.role !== req.user.role))) {
      return reply.code(400).send({ error: 'SELF_CHANGE', message: 'You cannot disable your own account or change your own role.' })
    }
    return sql.begin(async tx => {
      const [old] = await tx`SELECT * FROM users WHERE id = ${id} AND role <> 'citizen' FOR UPDATE`
      if (!old) return reply.code(404).send({ error: 'NOT_FOUND', message: 'User not found.' })
      if (b.mobile && b.mobile !== old.mobile) {
        const [dup] = await tx`SELECT id FROM users WHERE mobile = ${b.mobile} AND id <> ${id}`
        if (dup) return reply.code(409).send({ error: 'MOBILE_TAKEN', message: 'Another user already has this mobile number.' })
      }
      const role = b.role ?? old.role
      const next = {
        name: b.name ?? old.name, mobile: b.mobile ?? old.mobile, role, office_name: b.officeName ?? old.office_name,
        office_id: b.officeId === undefined ? old.office_id : b.officeId,
        wards: b.wards === undefined ? old.wards : (b.wards?.length ? b.wards : null),
        data_source: role === 'dept_data_officer' ? (b.dataSource === undefined ? old.data_source : b.dataSource) : null,
        active: b.active ?? old.active,
      }
      if (next.role === 'dept_data_officer' && !next.data_source) return reply.code(400).send({ error: 'DATA_SOURCE_REQUIRED', message: 'Choose the department whose files this officer uploads.' })
      await tx`UPDATE users SET ${tx(next, 'name', 'mobile', 'role', 'office_name', 'office_id', 'wards', 'data_source', 'active')} WHERE id = ${id}`
      const changed = Object.fromEntries(Object.entries(next).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(old[k])).map(([k, v]) => [k, { from: k === 'mobile' ? '******' + String(old[k]).slice(-4) : old[k], to: k === 'mobile' ? '******' + String(v).slice(-4) : v }]))
      const action = b.active === false && old.active ? 'user बंद केला' : b.active === true && !old.active ? 'user पुन्हा सुरू केला' : 'user ची माहिती बदलली'
      await audit(tx as unknown as Sql, req.user, action, id, changed)
      return { id, changed: Object.keys(changed) }
    })
  })

  app.get('/admin/offices', async () => sql`
    SELECT o.id, o.name, o.kind, o.parent_id, (SELECT count(*) FROM users u WHERE u.office_id = o.id AND u.active)::int AS users
    FROM offices o ORDER BY o.kind, o.id`)

  app.get('/admin/system', async () => {
    const started = Date.now()
    const [db] = await sql`SELECT version() AS version, pg_size_pretty(pg_database_size(current_database())) AS size`
    const dbMs = Date.now() - started
    const migrations = await sql`SELECT name, applied_at FROM schema_migrations ORDER BY name`
    const files = readdirSync(join(import.meta.dirname, '../../migrations')).filter(f => f.endsWith('.sql')).sort()
    const [u] = await sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE active)::int AS active FROM users WHERE role <> 'citizen'`
    const [act] = await sql`SELECT
        (SELECT max(run_at) FROM matching_runs) AS last_matching,
        (SELECT max(uploaded_at) FROM uploads WHERE status = 'committed') AS last_upload,
        (SELECT count(*) FROM audit_log WHERE action = 'प्रवेश (login)' AND at > now() - interval '24 hours')::int AS logins_24h`
    return {
      version: VERSION, node: process.version, uptimeSeconds: Math.round(process.uptime()),
      demoMode: process.env.DEMO_MODE === 'true', environment: process.env.NODE_ENV ?? 'development',
      database: { ok: true, responseMs: dbMs, size: db.size, engine: String(db.version).split(' on ')[0] },
      migrations: { applied: migrations.length, pending: files.filter(f => !migrations.some(m => m.name === f)) },
      users: u, activity: act,
    }
  })

  // API keys for department systems. The full key is returned once at creation; only its hash is stored.
  app.get('/admin/integrations', async () => sql`
    SELECT ic.id, ic.name, ic.source, ic.key_prefix, ic.active, ic.created_at, ic.last_used_at, ic.records_received, u.name AS created_by
    FROM integration_clients ic LEFT JOIN users u ON u.id = ic.created_by ORDER BY ic.active DESC, ic.created_at DESC`)

  app.post('/admin/integrations', async req => {
    const b = z.object({ name: z.string().trim().min(3).max(100), source: z.enum(SOURCES) }).parse(req.body)
    const key = `mp_live_${randomBytes(20).toString('hex')}`
    const id = 'int_' + randomBytes(4).toString('hex')
    await sql.begin(async tx => {
      await tx`INSERT INTO integration_clients (id, name, source, key_prefix, key_hash, created_by)
        VALUES (${id}, ${b.name}, ${b.source}, ${key.slice(0, 14)}, ${createHash('sha256').update(key).digest('hex')}, ${req.user.id})`
      await audit(tx as unknown as Sql, req.user, 'विभागासाठी API key तयार केली', id, { name: b.name, source: b.source })
    })
    return { id, key }
  })

  app.patch('/admin/integrations/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { active } = z.object({ active: z.boolean() }).parse(req.body)
    const [r] = await sql`UPDATE integration_clients SET active = ${active} WHERE id = ${id} RETURNING id, name`
    if (!r) return reply.code(404).send({ error: 'NOT_FOUND', message: 'API key not found.' })
    await audit(sql, req.user, active ? 'API key पुन्हा सुरू केली' : 'API key रद्द केली', id, { name: r.name })
    return { id, active }
  })

  // The admin sees their own actions and sign-ins, not case or data activity.
  app.get('/admin/audit', async () => sql`
    SELECT a.at, a.action, a.entity, a.role, a.detail, u.name AS who
    FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
    WHERE a.role IN ('platform_admin', 'integration') OR a.action = 'प्रवेश (login)'
    ORDER BY a.at DESC, a.id DESC LIMIT 300`)
}
