// What each department file must contain, the header spellings we recognise,
// and how one raw row becomes a clean record (or a clear rejection reason).
import { phonetic, transliterate } from './normalize.ts'

export type Source = 'tax' | 'oc' | 'elec' | 'igr' | 'water'
type Kind = 'text' | 'int' | 'date' | 'usage' | 'tariff' | 'bool'

export interface FieldDef { key: string; label: string; kind: Kind; required: boolean; aliases: string[] }

const f = (key: string, label: string, kind: Kind, required: boolean, aliases: string[]): FieldDef => ({ key, label, kind, required, aliases })

export const FIELDS: Record<Source, FieldDef[]> = {
  tax: [
    f('taxNo', 'मालमत्ता / कर क्रमांक', 'text', true, ['property_no', 'property no', 'tax_no', 'tax no', 'assessment_no', 'मालमत्ता क्रमांक', 'कर क्रमांक']),
    f('owner', 'मालकाचे नाव', 'text', true, ['owner', 'owner_name', 'owner name', 'मालक', 'मालकाचे नाव']),
    f('address', 'पत्ता', 'text', true, ['address', 'property_address', 'पत्ता']),
    f('ward', 'प्रभाग', 'int', false, ['ward', 'ward_no', 'ward no', 'प्रभाग', 'प्रभाग क्रमांक']),
    f('usage', 'वापर (निवासी / व्यावसायिक / मिश्र)', 'usage', true, ['usage', 'usage_type', 'use', 'वापर']),
    f('assessedArea', 'आकारलेले क्षेत्रफळ (चौ.फूट)', 'int', true, ['assessed_area', 'area', 'area_sqft', 'क्षेत्रफळ', 'आकारलेले क्षेत्रफळ']),
    f('annualTax', 'वार्षिक कर (₹)', 'int', false, ['annual_tax', 'tax', 'tax_amount', 'वार्षिक कर']),
    f('lastPaid', 'शेवटचा भरणा दिनांक', 'date', false, ['last_paid', 'last_payment', 'शेवटचा भरणा']),
    f('arrears', 'थकबाकी (₹)', 'int', false, ['arrears', 'dues', 'थकबाकी']),
  ],
  oc: [
    f('ocNo', 'OC क्रमांक', 'text', true, ['oc_no', 'oc number', 'oc', 'occupancy_no', 'भोगवटा क्रमांक']),
    f('date', 'OC दिनांक', 'date', true, ['issue_date', 'oc_date', 'date', 'दिनांक']),
    f('address', 'जागेचा पत्ता', 'text', true, ['site_address', 'address', 'पत्ता']),
    f('ward', 'प्रभाग', 'int', false, ['ward', 'ward_no', 'प्रभाग']),
    f('owner', 'अर्जदार / मालक', 'text', false, ['applicant', 'owner', 'अर्जदार', 'मालक']),
    f('builtUpArea', 'बांधीव क्षेत्रफळ (चौ.फूट)', 'int', true, ['builtup_area', 'built_up_area', 'bua', 'बांधीव क्षेत्रफळ']),
    f('units', 'सदनिका / गाळे', 'int', false, ['units', 'flats', 'सदनिका']),
  ],
  elec: [
    f('consumerNo', 'ग्राहक क्रमांक', 'text', true, ['consumer_no', 'consumer number', 'consumer_number', 'ग्राहक क्रमांक']),
    f('name', 'ग्राहकाचे नाव', 'text', false, ['consumer_name', 'name', 'नाव']),
    f('address', 'जागेचा पत्ता', 'text', true, ['premise_address', 'address', 'पत्ता']),
    f('ward', 'प्रभाग', 'int', false, ['ward', 'प्रभाग']),
    f('category', 'दर प्रकार (Tariff)', 'tariff', true, ['tariff', 'category', 'tariff_category', 'दर प्रकार']),
    f('since', 'जोडणी दिनांक', 'date', false, ['conn_date', 'connection_date', 'since', 'जोडणी दिनांक']),
    f('avgMonthlyUnits', 'सरासरी मासिक युनिट', 'int', false, ['avg_units', 'average_units', 'units', 'युनिट']),
  ],
  igr: [
    f('docNo', 'दस्त क्रमांक', 'text', true, ['doc_no', 'document_no', 'document number', 'दस्त क्रमांक']),
    f('date', 'नोंदणी दिनांक', 'date', true, ['reg_date', 'registration_date', 'date', 'दिनांक']),
    f('buyer', 'खरेदीदार', 'text', true, ['buyer', 'claimant', 'purchaser', 'खरेदीदार']),
    f('seller', 'विक्रेता', 'text', false, ['seller', 'executant', 'विक्रेता']),
    f('address', 'मालमत्तेचा पत्ता', 'text', true, ['property_desc', 'property_address', 'address', 'पत्ता']),
  ],
  water: [
    f('connNo', 'नळ जोडणी क्रमांक', 'text', true, ['conn_no', 'connection_no', 'connection number', 'जोडणी क्रमांक']),
    f('name', 'ग्राहकाचे नाव', 'text', false, ['name', 'consumer_name', 'नाव']),
    f('address', 'पत्ता', 'text', true, ['address', 'पत्ता']),
    f('ward', 'प्रभाग', 'int', false, ['ward', 'प्रभाग']),
    f('since', 'जोडणी दिनांक', 'date', false, ['conn_date', 'since', 'दिनांक']),
  ],
}

export const REF_FIELD: Record<Source, string> = { tax: 'taxNo', oc: 'ocNo', elec: 'consumerNo', igr: 'docNo', water: 'connNo' }

const key = (h: string) => phonetic(transliterate(h).toLowerCase().replace(/[^a-z0-9]+/g, ''))

/** Suggest a file column for every field, by comparing header spellings. */
export function suggestMapping(source: Source, headers: string[]): Record<string, string | null> {
  const used = new Set<string>()
  const out: Record<string, string | null> = {}
  for (const fd of FIELDS[source]) {
    const wanted = [fd.key, ...fd.aliases].map(key)
    const hit = headers.find(h => !used.has(h) && wanted.includes(key(h)))
    out[fd.key] = hit ?? null
    if (hit) used.add(hit)
  }
  return out
}

function validDate(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (y < 1900 || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return dt.toISOString().slice(0, 10)
}

function parseDate(v: string): string | null {
  const s = v.trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return validDate(+m[1], +m[2], +m[3])
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)   // dd-mm-yyyy, the usual Indian format
  if (m) return validDate(+m[3], +m[2], +m[1])
  return null
}

function parseUsage(v: string): 'residential' | 'commercial' | 'mixed' | null {
  const s = transliterate(v).toLowerCase().trim()
  if (/^(r|res|residential|nivasi|niwasi|घर)/.test(s)) return 'residential'
  if (/^(c|com|commercial|vyavsayik|vyavasayik|vyapari|bigar)/.test(s)) return 'commercial'
  if (/^(m|mix|mixed|mishr)/.test(s)) return 'mixed'
  return null
}

const parseTariff = (v: string) => (/lt\s*-?\s*(ii|2)\b|commercial|vyav|व्याव/i.test(v) ? 'LT-II व्यावसायिक' : 'LT-I निवासी')

export interface RowResult { ok: boolean; data?: Record<string, unknown>; errors: string[] }

/** lang 'en' gives errors with field keys, for machine (API) clients; 'mr' uses the Marathi labels. */
export function coerceRow(source: Source, raw: Record<string, string>, mapping: Record<string, string | null>, lang: 'mr' | 'en' = 'mr'): RowResult {
  const data: Record<string, unknown> = {}
  const errors: string[] = []
  for (const fd of FIELDS[source]) {
    const col = mapping[fd.key]
    const v = (col ? raw[col] : '')?.toString().trim() ?? ''
    const en = lang === 'en'
    if (!v) { if (fd.required) errors.push(en ? `${fd.key} is required` : `${fd.label} रिकामे`); continue }
    switch (fd.kind) {
      case 'text': data[fd.key] = v; break
      case 'int': {
        const n = Number(v.replace(/[,₹\s]/g, ''))
        if (Number.isFinite(n) && n >= 0) data[fd.key] = Math.round(n)
        else errors.push(en ? `${fd.key}: "${v}" is not a non-negative number` : `${fd.label}: "${v}" संख्या नाही`)
        break
      }
      case 'date': { const d = parseDate(v); if (d) data[fd.key] = d; else errors.push(en ? `${fd.key}: "${v}" is not a valid date (use YYYY-MM-DD or DD-MM-YYYY)` : `${fd.label}: "${v}" दिनांक ओळखता आला नाही`); break }
      case 'usage': { const u = parseUsage(v); if (u) data[fd.key] = u; else errors.push(en ? `${fd.key}: "${v}" must be residential, commercial or mixed` : `${fd.label}: "${v}" ओळखता आले नाही`); break }
      case 'tariff': data[fd.key] = parseTariff(v); break
      case 'bool': data[fd.key] = /^(y|yes|true|1|होय)$/i.test(v); break
    }
  }
  return { ok: errors.length === 0, data, errors }
}
