// Matching rules and demand estimate. Shared by the web demo data and the API's matching engine.
import type { Property, RuleId, Usage } from '../data/types'

/** Demo assessment rates, ₹ per sq ft per year. Real rates come from the corporation's schedule. */
export const RATE: Record<Usage, number> = { residential: 3, commercial: 8, mixed: 5.5 }

/** Years of back-assessment used for properties missing from the tax roll. */
export const BACK_YEARS = 3

export function rulesFor(p: Pick<Property, 'tax' | 'oc' | 'elec' | 'igr' | 'water'>): RuleId[] {
  const r: RuleId[] = []
  if (p.oc && !p.tax) r.push('R1')
  if (p.elec && !p.tax) r.push('R2')
  if (p.tax && p.elec && p.tax.usage === 'residential' && p.elec.category === 'LT-II व्यावसायिक') r.push('R3')
  if (p.igr && p.tax && p.tax.owner !== p.igr.buyer) r.push('R4')
  if (p.oc && p.tax && p.oc.builtUpArea > p.tax.assessedArea * 1.1) r.push('R5')
  if (p.water && !p.tax) r.push('R6')
  return r
}

export function estimateDemand(p: Pick<Property, 'tax' | 'oc' | 'usage' | 'area'>, rules: RuleId[]): number {
  let d = 0
  if (!p.tax && (rules.includes('R1') || rules.includes('R2') || rules.includes('R6'))) {
    d += p.area * RATE[p.usage] * BACK_YEARS
  }
  if (rules.includes('R3') && p.tax) d += p.tax.assessedArea * (RATE[p.usage] - RATE.residential) * 2
  if (rules.includes('R5') && p.tax && p.oc) d += (p.oc.builtUpArea - p.tax.assessedArea) * RATE[p.tax.usage] * 2
  return Math.round(d / 100) * 100
}

/** Tax added to the roll every year once the case is settled (the one-time demand also covers back years). */
export function annualIncrease(p: Pick<Property, 'tax' | 'oc' | 'usage' | 'area'>, rules: RuleId[]): number {
  let d = 0
  if (!p.tax && (rules.includes('R1') || rules.includes('R2') || rules.includes('R6'))) d += p.area * RATE[p.usage]
  if (rules.includes('R3') && p.tax) d += p.tax.assessedArea * (RATE[p.usage] - RATE.residential)
  if (rules.includes('R5') && p.tax && p.oc) d += (p.oc.builtUpArea - p.tax.assessedArea) * RATE[p.tax.usage]
  return Math.max(0, Math.round(d / 10) * 10)
}

export const confidenceFor = (rules: RuleId[], matchScore = 1) =>
  Math.min(97, Math.round((58 + rules.length * 12) * Math.min(1, matchScore + 0.1)))
