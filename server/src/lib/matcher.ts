// Decides, for one department record, which property it belongs to.
// Pure logic: the route loads data, calls decide(), and writes the outcome.
import { normalizeAddress, normalizeName, tokenSetSimilarity, type Normalized } from './normalize.ts'

export const LINK_AT = 0.8      // at or above: link automatically
export const REVIEW_AT = 0.55   // between REVIEW_AT and LINK_AT: an officer confirms
const AMBIGUOUS_GAP = 0.05      // two candidates this close: an officer confirms

export interface Candidate { id: string; ward: number; addr: Normalized; name: string[] }
export interface Incoming { address: string; name?: string; ward?: number | null }

export type Decision =
  | { kind: 'link'; propertyId: string; score: number }
  | { kind: 'review'; propertyId: string; score: number; runnerUp?: { propertyId: string; score: number } }
  | { kind: 'new'; bestScore: number }

export function prepare(p: { id: string; ward: number; address: string; owner?: string }): Candidate {
  return { id: p.id, ward: p.ward, addr: normalizeAddress(p.address), name: p.owner ? normalizeName(p.owner) : [] }
}

export function score(rec: { addr: Normalized; name: string[]; ward?: number | null }, c: Candidate): number {
  const addr = tokenSetSimilarity(rec.addr.tokens, c.addr.tokens)
  const bothHouse = rec.addr.houseNo && c.addr.houseNo
  if (bothHouse && rec.addr.houseNo !== c.addr.houseNo) return Math.min(0.4, addr * 0.4)
  const house = bothHouse ? 1 : 0.5
  const name = rec.name.length && c.name.length ? tokenSetSimilarity(rec.name, c.name) : null
  let s = name === null ? 0.7 * addr + 0.3 * house : 0.55 * addr + 0.25 * house + 0.2 * name
  if (rec.ward && c.ward && rec.ward !== c.ward) s *= 0.6
  return Math.round(s * 1000) / 1000
}

/** Index by house number so each record is compared with a handful of properties, not all of them. */
export class CandidateIndex {
  private byHouse = new Map<string, Candidate[]>()
  private noHouse: Candidate[] = []
  private all: Candidate[] = []
  add(c: Candidate) {
    this.all.push(c)
    if (c.addr.houseNo) {
      const k = c.addr.houseNo
      this.byHouse.set(k, [...(this.byHouse.get(k) ?? []), c])
    } else this.noHouse.push(c)
  }
  candidatesFor(addr: Normalized, ward?: number | null): Candidate[] {
    if (addr.houseNo) return [...(this.byHouse.get(addr.houseNo) ?? []), ...this.noHouse]
    return ward ? this.all.filter(c => c.ward === ward) : this.all
  }
}

export function decide(rec: Incoming, index: CandidateIndex): Decision {
  const r = { addr: normalizeAddress(rec.address), name: rec.name ? normalizeName(rec.name) : [], ward: rec.ward }
  const scored = index.candidatesFor(r.addr, rec.ward)
    .map(c => ({ propertyId: c.id, score: score(r, c) }))
    .sort((a, b) => b.score - a.score)
  const [top, second] = scored
  if (!top || top.score < REVIEW_AT) return { kind: 'new', bestScore: top?.score ?? 0 }
  const ambiguous = second && top.score - second.score < AMBIGUOUS_GAP
  if (top.score >= LINK_AT && !ambiguous) return { kind: 'link', propertyId: top.propertyId, score: top.score }
  return { kind: 'review', propertyId: top.propertyId, score: top.score, runnerUp: second && second.score >= REVIEW_AT ? second : undefined }
}
