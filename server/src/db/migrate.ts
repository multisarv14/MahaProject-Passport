import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sql } from './client.ts'

const dir = join(import.meta.dirname, '../../migrations')

await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`
const done = new Set((await sql<{ name: string }[]>`SELECT name FROM schema_migrations`).map(r => r.name))

for (const file of readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
  if (done.has(file)) continue
  await sql.begin(async tx => {
    await tx.unsafe(readFileSync(join(dir, file), 'utf8'))
    await tx`INSERT INTO schema_migrations (name) VALUES (${file})`
  })
  console.log('applied', file)
}
await sql.end()
