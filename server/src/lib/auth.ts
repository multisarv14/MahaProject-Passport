import type { FastifyReply, FastifyRequest } from 'fastify'
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
