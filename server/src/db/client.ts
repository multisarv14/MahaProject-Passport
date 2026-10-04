import postgres from 'postgres'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')

export const sql = postgres(process.env.DATABASE_URL, {
  max: 10,
  onnotice: () => {},
  // Keep SQL DATE values as 'YYYY-MM-DD' strings so they never shift across time zones.
  types: { date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x } },
})
export type Sql = typeof sql
