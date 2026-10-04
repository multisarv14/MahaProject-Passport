import { createHash } from 'node:crypto'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import { ZodError } from 'zod'
import authRoutes from './routes/auth.ts'
import caseRoutes from './routes/cases.ts'
import ingestRoutes, { integrationRoutes } from './routes/ingest.ts'
import adminRoutes from './routes/admin.ts'

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set')

const production = process.env.NODE_ENV === 'production'
if (production && process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters in production')

// trustProxy: the API runs behind Caddy, so client IPs come from X-Forwarded-For.
const app = Fastify({ logger: { level: 'info' }, trustProxy: true, bodyLimit: 1024 * 1024 })

// Same-origin in production (Caddy serves web and API together); open in development.
await app.register(cors, { origin: process.env.CORS_ORIGIN?.split(',') ?? !production })
// Limit per signed-in session, not per IP: a whole municipal office often shares one public IP.
// Unauthenticated requests (login, OTP) are limited per IP.
await app.register(rateLimit, {
  max: 600,
  timeWindow: '1 minute',
  keyGenerator: req => {
    const auth = req.headers.authorization
    return auth ? 'session:' + createHash('sha256').update(auth).digest('hex').slice(0, 32) : 'ip:' + req.ip
  },
})
await app.register(jwt, { secret: process.env.JWT_SECRET })
await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024, files: 1 } })

app.setErrorHandler((err, _req, reply) => {
  if (err instanceof ZodError) {
    return reply.code(400).send({ error: 'VALIDATION', message: err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') })
  }
  const status = (err as { statusCode?: number }).statusCode
  if (status && status < 500) {
    return reply.code(status).send({ error: (err as { code?: string }).code ?? 'BAD_REQUEST', message: err instanceof Error ? err.message : 'Bad request' })
  }
  app.log.error(err)
  return reply.code(500).send({ error: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' })
})

const health = async () => ({ ok: true })
app.get('/health', health)
app.get('/api/health', health)
await app.register(authRoutes, { prefix: '/api' })
await app.register(caseRoutes, { prefix: '/api' })
await app.register(ingestRoutes, { prefix: '/api' })
await app.register(adminRoutes, { prefix: '/api' })
await app.register(integrationRoutes, { prefix: '/api' })

await app.listen({ port: Number(process.env.PORT ?? 4000), host: '0.0.0.0' })
