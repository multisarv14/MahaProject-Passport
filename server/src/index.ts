import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { ZodError } from 'zod'
import authRoutes from './routes/auth.ts'
import caseRoutes from './routes/cases.ts'

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set')

const app = Fastify({ logger: { level: 'info' } })

await app.register(cors, { origin: process.env.CORS_ORIGIN?.split(',') ?? true })
await app.register(jwt, { secret: process.env.JWT_SECRET })

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

app.get('/health', async () => ({ ok: true }))
await app.register(authRoutes, { prefix: '/api' })
await app.register(caseRoutes, { prefix: '/api' })

await app.listen({ port: Number(process.env.PORT ?? 4000), host: '0.0.0.0' })
