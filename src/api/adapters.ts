import type { Case, Property } from '../data/types'
import type { ApiCase, ApiProperty, ApiRecords, ApiStats } from './types'

const toX = (lng?: number) => (lng === undefined ? 50 : (lng - 74.5) * 1000)
const toY = (lat?: number) => (lat === undefined ? 50 : (lat - 19.0) * 1000)

/** API property + department records -> the Property shape the evidence components use. */
export function toProperty(p: ApiProperty, records: ApiRecords = p.records ?? {}): Property {
  return {
    id: p.id, ward: p.ward, address: p.address, owner: p.owner_name, usage: p.usage, area: p.area_sqft,
    x: toX(p.lng), y: toY(p.lat),
    tax: records.tax, oc: records.oc, elec: records.elec, igr: records.igr, water: records.water,
  }
}

export function toCase(c: ApiCase): Case {
  return {
    id: c.id, propertyId: c.property_id, rules: c.rules, confidence: c.confidence, status: c.status,
    estDemand: Number(c.est_demand), approvedDemand: c.approved_demand ? Number(c.approved_demand) : undefined,
    recovered: c.recovered ? Number(c.recovered) : undefined, assignedTo: c.assigned_to ?? undefined,
    openedOn: c.opened_on, noticeNo: c.notice_no ?? undefined, noticeDate: c.notice_date ?? undefined,
    visit: c.visit ? {
      date: c.visit.visited_on, by: c.visit.visited_by, exists: c.visit.structure_found, usageFound: c.visit.usage_found,
      measuredArea: c.visit.measured_area, photos: c.visit.photos, gps: `${c.visit.lat.toFixed(5)}, ${c.visit.lng.toFixed(5)}`, remarks: c.visit.remarks,
    } : undefined,
    objection: c.objection ? {
      date: c.objection.filed_on, text: c.objection.text, decision: c.objection.decision ?? undefined,
      decisionDate: c.objection.decided_on ?? undefined, decisionNote: c.objection.decision_note ?? undefined,
    } : undefined,
  }
}

/** Same figures the dashboards show, computed from /stats. */
export function summarize(s: ApiStats) {
  const get = (st: string) => s.byStatus.find(x => x.status === st)
  const n = (...st: string[]) => st.reduce((a, x) => a + (get(x)?.n ?? 0), 0)
  const sum = (f: 'est' | 'approved' | 'recovered', ...st: string[]) => st.reduce((a, x) => a + Number(get(x)?.[f] ?? 0), 0)
  const visited = n('verified', 'not_found', 'notice_sent', 'objection', 'recovered', 'closed')
  const confirmed = n('verified', 'notice_sent', 'objection', 'recovered')
  return {
    properties: s.properties,
    total: s.byStatus.reduce((a, x) => a + x.n, 0),
    suspected: n('suspected'), assigned: n('assigned'), visited, confirmed,
    noticed: n('notice_sent', 'objection', 'recovered'), objections: n('objection'), recoveredCount: n('recovered'),
    potential: sum('est', 'suspected', 'assigned', 'verified', 'notice_sent', 'objection', 'recovered'),
    demand: sum('approved', 'notice_sent', 'objection', 'recovered'),
    recovered: sum('recovered', 'recovered'),
    accuracy: visited ? Math.round((confirmed / visited) * 100) : 0,
    ruleCount: Object.fromEntries(s.byRule.map(r => [r.rule, r.n])) as Record<string, number>,
  }
}
