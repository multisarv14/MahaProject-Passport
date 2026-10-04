import type { FastifyReply, FastifyRequest } from 'fastify'
import { sql } from '../db/client.ts'
import type { Role } from './workflow.ts'

export interface SessionUser {
  id: string
  name: string
  role: Role
  wards: number[] | null
}

declare module '@fastify/jwt' {
  interface FastifyJWT { payload: SessionUser; user: SessionUser }
}

export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
  } catch {
    return reply.code(401).send({ error: 'UNAUTHENTICATED', message: 'Please sign in again.' })
  }
  // Role, wards and active flag come from the database on every request, so a deactivated
  // user or a changed role takes effect immediately rather than when the token expires.
  const [u] = await sql<{ name: string; role: Role; wards: number[] | null; active: boolean }[]>`
    SELECT name, role, wards, active FROM users WHERE id = ${req.user.id}`
  if (!u || !u.active) return reply.code(401).send({ error: 'ACCOUNT_DISABLED', message: 'This account is disabled. Contact the administrator.' })
  req.user = { id: req.user.id, name: u.name, role: u.role, wards: u.wards }
}

export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!roles.includes(req.user.role)) {
      return reply.code(403).send({ error: 'FORBIDDEN_ROLE', message: `This action is not available to role ${req.user.role}.` })
    }
  }
}

/** Wards a user may see; null means the whole city. */
export const wardScope = (u: SessionUser) => u.wards
