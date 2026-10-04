import type { Sql } from '../db/client.ts'
import type { SessionUser } from './auth.ts'

export function audit(tx: Sql, user: SessionUser | null, action: string, entity: string, detail?: object) {
  return tx`INSERT INTO audit_log (user_id, role, action, entity, detail)
    VALUES (${user?.id ?? null}, ${user?.role ?? null}, ${action}, ${entity}, ${detail ? tx.json(detail as never) : null})`
}
