import type { Case, CaseStatus, RuleId } from '../data/types'
import { PROPERTY_BY_ID } from '../data/mock'

export function caseStats(cases: Case[]) {
  const by = (s: CaseStatus[]) => cases.filter(c => s.includes(c.status))
  const verifiedPlus = by(['verified', 'notice_sent', 'objection', 'recovered'])
  const visited = by(['verified', 'not_found', 'notice_sent', 'objection', 'recovered'])
  const noticed = by(['notice_sent', 'objection', 'recovered'])
  const sum = (a: Case[], f: (c: Case) => number) => a.reduce((s, c) => s + f(c), 0)
  const ruleCount = {} as Record<RuleId, number>
  for (const c of cases) for (const r of c.rules) ruleCount[r] = (ruleCount[r] ?? 0) + 1
  return {
    total: cases.length,
    suspected: by(['suspected']).length,
    assigned: by(['assigned']).length,
    visited: visited.length,
    confirmed: verifiedPlus.length,
    notFound: by(['not_found']).length,
    noticed: noticed.length,
    objections: by(['objection']).length,
    recoveredCount: by(['recovered']).length,
    potential: sum(cases.filter(c => c.status !== 'not_found' && c.status !== 'closed'), c => c.estDemand),
    demand: sum(noticed, c => c.approvedDemand ?? 0),
    recovered: sum(by(['recovered']), c => c.recovered ?? 0),
    accuracy: visited.length ? Math.round((verifiedPlus.length / visited.length) * 100) : 0,
    ruleCount,
  }
}

export const wardOf = (c: Case) => PROPERTY_BY_ID[c.propertyId].ward
