import { createHash, randomInt } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sql } from '../db/client.ts'
import { audit } from '../lib/audit.ts'
import { requireUser, type SessionUser } from '../lib/auth.ts'

const hash = (s: string) => createHash('sha256').update(s).digest('hex')
const demo = () => process.env.DEMO_MODE === 'true'

/** Demo-only fixed login: DEMO_MOBILE always receives DEMO_OTP. Ignored unless DEMO_MODE=true. */
const fixedDemoOtp = (mobile: string) =>
  demo() && /^\d{10}$/.test(process.env.DEMO_MOBILE ?? '') && /^\d{6}$/.test(process.env.DEMO_OTP ?? '') && mobile === process.env.DEMO_MOBILE
    ? process.env.DEMO_OTP!
    : null

async function issue(app: FastifyInstance, userId: string) {
  const [u] = await sql<{ id: string; name: string; role: SessionUser['role']; wards: number[] | null; office_name: string }[]>`
    SELECT id, name, role, wards, office_name FROM users WHERE id = ${userId} AND active`
  if (!u) return null
  const session: SessionUser = { id: u.id, name: u.name, role: u.role, wards: u.wards }
  await audit(sql, session, 'प्रवेश (login)', u.id)
  return { token: app.jwt.sign(session, { expiresIn: '8h' }), user: { ...session, office: u.office_name } }
}

export default async function authRoutes(app: FastifyInstance) {
  app.post('/auth/otp', { config: { rateLimit: { max: 10, timeWindow: '10 minutes' } } }, async (req, reply) => {
    const { mobile } = z.object({ mobile: z.string().regex(/^\d{10}$/) }).parse(req.body)
    const [u] = await sql`SELECT id FROM users WHERE mobile = ${mobile} AND active`
    // Same response whether or not the number exists, so the endpoint cannot be used to discover users.
    const fixed = fixedDemoOtp(mobile)
    const code = fixed ?? String(randomInt(100000, 1000000))
    if (u) {
      const [recent] = await sql`SELECT count(*)::int AS n FROM otp_requests WHERE mobile = ${mobile} AND created_at > now() - interval '10 minutes'`
      if (recent.n >= 5) return reply.code(429).send({ error: 'TOO_MANY_REQUESTS', message: 'Too many OTP requests. Try again in 10 minutes.' })
      await sql`INSERT INTO otp_requests (mobile, code_hash, expires_at) VALUES (${mobile}, ${hash(mobile + code)}, now() + interval '5 minutes')`
      // Production: send through the SMS gateway here.
      app.log.info({ mobile }, 'OTP issued')
    }
    return { sent: true, ...(demo() && u && !fixed ? { devCode: code } : {}) }
  })

  app.post('/auth/verify', { config: { rateLimit: { max: 20, timeWindow: '10 minutes' } } }, async (req, reply) => {
    const { mobile, code } = z.object({ mobile: z.string(), code: z.string().length(6) }).parse(req.body)
    const [otp] = await sql`SELECT id, code_hash, attempts FROM otp_requests
      WHERE mobile = ${mobile} AND NOT used AND expires_at > now() ORDER BY created_at DESC LIMIT 1`
    if (!otp || otp.attempts >= 5) return reply.code(401).send({ error: 'OTP_INVALID', message: 'OTP expired or invalid. Request a new one.' })
    if (otp.code_hash !== hash(mobile + code)) {
      await sql`UPDATE otp_requests SET attempts = attempts + 1 WHERE id = ${otp.id}`
      return reply.code(401).send({ error: 'OTP_INVALID', message: 'Incorrect OTP.' })
    }
    await sql`UPDATE otp_requests SET used = true WHERE id = ${otp.id}`
    const [u] = await sql`SELECT id FROM users WHERE mobile = ${mobile}`
    return issue(app, u.id)
  })

  // Demo only: one-click sign-in as any persona. Disabled unless DEMO_MODE=true.
  app.post('/auth/demo-login', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
    if (!demo()) return reply.code(404).send({ error: 'NOT_FOUND' })
    const { userId } = z.object({ userId: z.string() }).parse(req.body)
    const r = await issue(app, userId)
    return r ?? reply.code(404).send({ error: 'NOT_FOUND', message: 'No such user.' })
  })

  app.get('/me', { preHandler: requireUser }, async req => req.user)

  app.get('/demo/config', async (_req, reply) => {
    if (!demo()) return reply.code(404).send({ error: 'NOT_FOUND' })
    return { defaultMobile: process.env.DEMO_MOBILE ?? null }
  })

  app.get('/demo/users', async (_req, reply) => {
    if (!demo()) return reply.code(404).send({ error: 'NOT_FOUND' })
    return sql`SELECT id, name, role, office_name AS office, mobile FROM users ORDER BY created_at, id`
  })
}
