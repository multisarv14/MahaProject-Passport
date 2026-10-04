// All data in this file is fictional and generated for the demo.
// "नमुनानगर" (Namunanagar) is an invented city; no person or record is real.
import type {
  AuditEntry, Business, Case, CaseStatus, Persona, Property, Usage,
} from './types'
import { RATE, estimateDemand, rulesFor } from '../lib/rules'

export { RATE }

export const TODAY = '2026-10-04'
export const CITY = { mr: 'नमुनानगर महानगरपालिका', en: 'Namunanagar Municipal Corporation' }
export const DISTRICT = { mr: 'नमुना जिल्हा', en: 'Namuna District' }
export const CITY_CODE = 'NMN'

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20261007)
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)]
const between = (a: number, b: number) => Math.round(a + rnd() * (b - a))
const pad = (n: number, w: number) => String(n).padStart(w, '0')
const dateBack = (days: number) => {
  const d = new Date(TODAY + 'T00:00:00')
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export const WARDS = [1, 2, 3, 4, 5, 6, 7, 8]
export const WARD_NAMES: Record<number, string> = {
  0: 'प्रभाग निश्चित नाही',
  1: 'स्टेशन परिसर', 2: 'बाजार पेठ', 3: 'गणेश नगर', 4: 'नवीन वसाहत',
  5: 'औद्योगिक वसाहत', 6: 'नदीकाठ', 7: 'विद्यानगर', 8: 'पाटील मळा',
}

const FIRST = ['अनिल', 'सुनील', 'विजय', 'संजय', 'रमेश', 'सुरेश', 'महेश', 'प्रकाश', 'अशोक', 'दिलीप', 'नितीन', 'सचिन', 'योगेश', 'राजेंद्र', 'मंगेश', 'सुमन', 'शोभा', 'मीना', 'वैशाली', 'अश्विनी', 'कविता', 'स्वाती', 'उषा', 'रेखा', 'पल्लवी', 'हेमंत', 'तुषार', 'शरद', 'विनायक', 'किशोर']
const LAST = ['पाटील', 'जाधव', 'पवार', 'शिंदे', 'कुलकर्णी', 'देशमुख', 'गायकवाड', 'चव्हाण', 'कांबळे', 'भोसले', 'माने', 'सावंत', 'कदम', 'मोरे', 'जोशी', 'खैरनार', 'घोरपडे', 'नाईक', 'राऊत', 'बागुल']
const ROADS = ['मुख्य रस्ता', 'स्टेशन रोड', 'शाळा रस्ता', 'मंदिर गल्ली', 'तलाव रोड', 'बस स्थानक रोड', 'जुना बाजार रस्ता', 'नवीन पूल रस्ता']
const personName = () => `${pick(FIRST)} ${pick(LAST)}`

export const PERSONAS: Persona[] = [
  { id: 'u_admin', name: 'नेहा सावंत', role: 'platform_admin', office: 'MultiSarv सहाय्य कक्ष' },
  { id: 'u_state', name: 'डॉ. विवेक रानडे', role: 'state_lead', office: 'नगरविकास विभाग (Demo)' },
  { id: 'u_coll', name: 'माधवी गोखले', role: 'collector', office: 'जिल्हाधिकारी कार्यालय, नमुना जिल्हा' },
  { id: 'u_comm', name: 'राहुल भोसले', role: 'commissioner', office: 'नमुनानगर महानगरपालिका' },
  { id: 'u_ao', name: 'स्नेहल पवार', role: 'assessment_officer', office: 'कर निर्धारण विभाग' },
  { id: 'u_wo', name: 'संदीप कदम', role: 'ward_officer', office: 'प्रभाग कार्यालय (प्रभाग १–४)' },
  // One demo user per role: a single inspector covers every ward so any case can be shown end to end.
  { id: 'u_in1', name: 'अमोल शिंदे', role: 'inspector', office: 'सर्व प्रभाग' },
  { id: 'u_ho', name: 'मनोज देशपांडे', role: 'hearing_officer', office: 'सुनावणी कक्ष' },
  { id: 'u_rc', name: 'सुनीता वाघ', role: 'recovery_clerk', office: 'वसुली विभाग' },
  { id: 'u_do', name: 'किरण थोरात', role: 'dept_data_officer', office: 'MSEDCL नोडल (Demo)' },
  { id: 'u_aud', name: 'अर्चना लिमये', role: 'auditor', office: 'अंतर्गत लेखापरीक्षण' },
  { id: 'u_rep', name: 'नमुना मतदारसंघ', role: 'representative', office: 'लोकप्रतिनिधी कार्यालय (Demo)' },
  { id: 'u_bo', name: 'प्रशांत गायकवाड', role: 'business_officer', office: 'व्यवसाय कर कार्यालय (Demo)' },
  { id: 'u_cit', name: 'दत्तात्रय मोरे', role: 'citizen', office: 'मालमत्ताधारक' },
]

export const inspectorForWard = (ward: number): Persona | undefined =>
  ward > 0 ? PERSONAS.find(p => p.role === 'inspector' && (p.ward === undefined || p.ward === ward)) : undefined


function makeProperties(): Property[] {
  const out: Property[] = []
  for (let i = 1; i <= 520; i++) {
    const ward = WARDS[(i - 1) % 8]
    const r = rnd()
    const usage: Usage = r < 0.72 ? 'residential' : r < 0.9 ? 'commercial' : 'mixed'
    const area = usage === 'commercial' ? between(220, 2400) : between(450, 3200)
    const owner = personName()
    const p: Property = {
      id: `MP-MH-${CITY_CODE}-2026-${pad(i, 6)}`,
      ward,
      address: `घर क्र. ${between(1, 240)}, ${pick(ROADS)}, ${WARD_NAMES[ward]}`,
      owner, usage, area,
      x: ((ward - 1) % 4) * 25 + 3 + rnd() * 19,
      y: Math.floor((ward - 1) / 4) * 50 + 4 + rnd() * 42,
    }
    const hasTax = rnd() > 0.13
    const hasOc = rnd() < (hasTax ? 0.32 : 0.55)
    if (hasOc) {
      p.oc = {
        ocNo: `OC/${CITY_CODE}/${between(2019, 2025)}/${pad(between(1, 900), 4)}`,
        date: dateBack(between(200, 2200)),
        builtUpArea: area,
        units: usage === 'commercial' ? between(1, 12) : between(1, 40),
        authority: 'नमुनानगर नगररचना विभाग',
      }
    }
    if (hasTax) {
      const disguised = usage !== 'residential' && rnd() < 0.3
      const underArea = hasOc && rnd() < 0.25
      const assessedArea = underArea ? Math.round(area * (0.6 + rnd() * 0.2)) : area
      const tUsage: Usage = disguised ? 'residential' : usage
      p.tax = {
        taxNo: `${ward}/${pad(between(1, 9999), 4)}`,
        owner,
        usage: tUsage,
        assessedArea,
        annualTax: Math.round(assessedArea * RATE[tUsage] / 10) * 10,
        lastPaid: dateBack(between(20, 500)),
        arrears: rnd() < 0.2 ? between(1, 30) * 500 : 0,
      }
    }
    if (rnd() < 0.95) {
      p.elec = {
        consumerNo: `${between(1000, 9999)}${pad(between(1, 99999), 5)}`,
        category: usage === 'residential' ? 'LT-I निवासी' : 'LT-II व्यावसायिक',
        since: dateBack(between(150, 3000)),
        avgMonthlyUnits: usage === 'residential' ? between(60, 320) : between(250, 1800),
      }
    }
    if (rnd() < 0.18) {
      const buyer = personName()
      const updated = rnd() < 0.55
      p.igr = { docNo: `IGR/${between(2023, 2026)}/${pad(between(1, 99999), 5)}`, date: dateBack(between(30, 800)), buyer, seller: owner }
      p.owner = buyer
      if (updated && p.tax) p.tax.owner = buyer
    }
    if (rnd() < 0.75) {
      p.water = { connNo: `W-${ward}-${pad(between(1, 9999), 4)}`, since: dateBack(between(100, 3000)), billed: !!p.tax }
    }
    out.push(p)
  }
  return out
}

export const PROPERTIES: Property[] = makeProperties()
export const PROPERTY_BY_ID: Record<string, Property> = Object.fromEntries(PROPERTIES.map(p => [p.id, p]))

function makeCases(): Case[] {
  const out: Case[] = []
  let n = 0
  for (const p of PROPERTIES) {
    const rules = rulesFor(p)
    if (!rules.length) continue
    n++
    const r = rnd()
    const est = estimateDemand(p, rules)
    let status: CaseStatus =
      r < 0.5 ? 'suspected' : r < 0.65 ? 'assigned' : r < 0.75 ? 'verified' : r < 0.78 ? 'not_found'
        : r < 0.88 ? 'notice_sent' : r < 0.92 ? 'objection' : 'recovered'
    // Nothing to collect (e.g. only the owner's name changed): the record is corrected and the case closed.
    if (!est && ['notice_sent', 'objection', 'recovered'].includes(status)) status = 'closed'
    const c: Case = {
      id: `C-${CITY_CODE}-${pad(n, 4)}`,
      propertyId: p.id,
      rules,
      confidence: Math.min(97, 58 + rules.length * 12 + between(0, 9)),
      status,
      estDemand: est,
      openedOn: dateBack(between(5, 75)),
    }
    if (status !== 'suspected') c.assignedTo = inspectorForWard(p.ward)!.id
    if (['verified', 'not_found', 'notice_sent', 'objection', 'recovered', 'closed'].includes(status)) {
      c.visit = {
        date: dateBack(between(2, 30)),
        by: c.assignedTo!,
        exists: status !== 'not_found',
        usageFound: p.usage,
        measuredArea: status === 'not_found' ? 0 : Math.round(p.area * (0.95 + rnd() * 0.08)),
        photos: status === 'not_found' ? 2 : between(3, 6),
        gps: `${(19.0 + p.y / 1000).toFixed(5)}, ${(74.5 + p.x / 1000).toFixed(5)}`,
        remarks: status === 'not_found' ? 'जागेवर बांधकाम आढळले नाही. मोकळा भूखंड.'
          : status === 'closed' ? 'नवीन मालकाची खात्री केली. कर नोंदीत मालकाचे नाव दुरुस्त केले.'
          : 'बांधकाम आढळले, वापर सुरू आहे.',
      }
    }
    if (['notice_sent', 'objection', 'recovered'].includes(status)) {
      c.approvedDemand = est
      c.noticeNo = `NOT/${CITY_CODE}/2026/${pad(n, 4)}`
      c.noticeDate = dateBack(between(1, 20))
    }
    if (status === 'objection') {
      c.objection = { date: dateBack(between(0, 6)), text: 'बांधकामाचे क्षेत्रफळ नोटिशीत जास्त दाखवले आहे. मोजणी पुन्हा करावी.' }
    }
    if (status === 'recovered') c.recovered = est
    out.push(c)
  }
  // Demo citizen: owner of the first case with a notice
  const demo = out.find(c => c.status === 'notice_sent')
  if (demo) {
    const p = PROPERTY_BY_ID[demo.propertyId]
    p.owner = 'दत्तात्रय मोरे'
    if (p.tax) p.tax.owner = 'दत्तात्रय मोरे'
  }
  return out
}

export const INITIAL_CASES: Case[] = makeCases()
export const CITIZEN_PROPERTY_ID = INITIAL_CASES.find(c => c.status === 'notice_sent')?.propertyId ?? PROPERTIES[0].id

export const INITIAL_AUDIT: AuditEntry[] = INITIAL_CASES.filter(c => c.status !== 'suspected').slice(0, 40).flatMap((c): AuditEntry[] => {
  const e: AuditEntry[] = [{ at: c.openedOn + ' 10:15', who: 'u_wo', role: 'ward_officer', action: 'प्रकरण निरीक्षकाकडे सोपवले', entity: c.id }]
  if (c.visit) e.push({ at: c.visit.date + ' 15:40', who: c.visit.by, role: 'inspector', action: 'प्रत्यक्ष पाहणी नोंदवली', entity: c.id })
  if (c.noticeDate) e.push({ at: c.noticeDate + ' 12:05', who: 'u_ao', role: 'assessment_officer', action: 'आकारणी मंजूर, नोटीस पाठवली', entity: c.id })
  return e
}).sort((a, b) => b.at.localeCompare(a.at))

const BIZ_TYPES = ['किराणा दुकान', 'औषध दुकान', 'हॉटेल', 'कापड दुकान', 'मोबाईल दुकान', 'दवाखाना', 'गॅरेज', 'बेकरी', 'हार्डवेअर', 'ब्युटी पार्लर']
const BIZ_PREFIX = ['श्री गणेश', 'साई', 'जय भवानी', 'महालक्ष्मी', 'ओम', 'न्यू', 'मातोश्री', 'शिवम', 'आदर्श', 'प्रगती']

function makeBusinesses(): Business[] {
  const out: Business[] = []
  const commercial = PROPERTIES.filter(p => p.usage !== 'residential').slice(0, 112)
  const paper = PROPERTIES.filter(p => p.usage === 'residential').slice(40, 48)
  let i = 0
  for (const p of [...commercial, ...paper]) {
    i++
    const isPaper = paper.includes(p)
    const type = pick(BIZ_TYPES)
    const b: Business = {
      id: `BP-MH-${CITY_CODE}-2026-${pad(i, 5)}`,
      name: `${pick(BIZ_PREFIX)} ${type}`,
      type, propertyId: p.id, ward: p.ward,
      shopAct: isPaper || rnd() < 0.7 ? `SA/${CITY_CODE}/${pad(between(1, 9999), 4)}` : undefined,
      ptNo: rnd() < 0.55 ? `PT${between(10000000, 99999999)}` : undefined,
      licence: rnd() < 0.6 ? `TL/${pad(between(1, 9999), 4)}` : undefined,
      gstin: isPaper || rnd() < 0.4 ? `27XXXXX${pad(between(1, 9999), 4)}X1Z${between(1, 9)}` : undefined,
      elecCommercial: !isPaper && p.elec?.category === 'LT-II व्यावसायिक',
      flags: [],
    }
    if (b.elecCommercial && !b.shopAct) b.flags.push('B1')
    if (b.shopAct && !b.ptNo) b.flags.push('B2')
    if (b.gstin && (isPaper || !p.elec)) b.flags.push('B3')
    out.push(b)
  }
  return out
}
export const BUSINESSES: Business[] = makeBusinesses()

export const DISTRICT_CITIES = [
  { mr: 'नमुनावाडी नगरपरिषद', en: 'Namunawadi Municipal Council', properties: 18400, cases: 1210, verified: 640, demand: 21400000, recovered: 8200000, live: false },
  { mr: 'नमुनापूर नगरपरिषद', en: 'Namunapur Municipal Council', properties: 12600, cases: 860, verified: 300, demand: 11800000, recovered: 3100000, live: false },
  { mr: 'नमुनाखेड नगरपरिषद', en: 'Namunakhed Municipal Council', properties: 9200, cases: 0, verified: 0, demand: 0, recovered: 0, live: false },
  { mr: 'नमुनागाव नगरपंचायत', en: 'Namunagaon Nagar Panchayat', properties: 4100, cases: 0, verified: 0, demand: 0, recovered: 0, live: false },
]

export const STATE_DISTRICTS = [
  { mr: 'नमुना जिल्हा', en: 'Namuna District', cities: 5, live: 3, demandCr: 0, pilot: true },
  { mr: 'उदाहरण जिल्हा अ', en: 'Sample District A', cities: 9, live: 0, demandCr: 0, pilot: false },
  { mr: 'उदाहरण जिल्हा ब', en: 'Sample District B', cities: 7, live: 0, demandCr: 0, pilot: false },
  { mr: 'उदाहरण जिल्हा क', en: 'Sample District C', cities: 11, live: 0, demandCr: 0, pilot: false },
  { mr: 'उदाहरण जिल्हा ड', en: 'Sample District D', cities: 6, live: 0, demandCr: 0, pilot: false },
]

export const DATA_SOURCES = [
  { id: 'tax', dept: { mr: 'महानगरपालिका: मालमत्ता कर', en: 'Municipal: Property Tax' }, file: 'property_tax_register_sep2026.xlsx', records: PROPERTIES.filter(p => p.tax).length, last: '2026-09-28', quality: 94, status: 'ok' },
  { id: 'oc', dept: { mr: 'नगररचना: बांधकाम परवानगी / OC', en: 'Town Planning: Permissions / OC' }, file: 'oc_list_2019_2026.csv', records: PROPERTIES.filter(p => p.oc).length, last: '2026-09-29', quality: 88, status: 'ok' },
  { id: 'elec', dept: { mr: 'MSEDCL: वीज जोडण्या', en: 'MSEDCL: Electricity Connections' }, file: 'msedcl_consumers_nmn.csv', records: PROPERTIES.filter(p => p.elec).length, last: '2026-09-30', quality: 91, status: 'ok' },
  { id: 'igr', dept: { mr: 'नोंदणी व मुद्रांक (IGR)', en: 'Registration & Stamps (IGR)' }, file: 'igr_transactions_2023_2026.xlsx', records: PROPERTIES.filter(p => p.igr).length, last: '2026-09-15', quality: 79, status: 'warn' },
  { id: 'water', dept: { mr: 'पाणीपुरवठा: नळ जोडण्या', en: 'Water Supply: Connections' }, file: 'water_connections.csv', records: PROPERTIES.filter(p => p.water).length, last: '2026-08-31', quality: 72, status: 'warn' },
] as const

// ---- CIDCO plot passport (proposed use; fictional plots in an invented node) ----
export type CidcoFlag = 'C1' | 'C2' | 'C3' | 'C4' | 'C5'
export interface CidcoPlot {
  id: string
  sector: number
  plotNo: string
  allottee: string
  allottedUse: 'residential' | 'commercial' | 'institutional'
  areaSqm: number
  leaseFrom: string
  permittedBua: number
  builtBua: number | null
  igrSale?: { docNo: string; date: string; buyer: string }
  transferNoc?: string
  elecCategory?: 'LT-I निवासी' | 'LT-II व्यावसायिक'
  arrears: number
  flags: CidcoFlag[]
  estCharges: number
}

/** Transfer charge slab by plot area (illustrative; CIDCO's schedule ranges from ₹25,000 to ₹10 lakh). */
export const cidcoTransferCharge = (sqm: number) => (sqm <= 50 ? 25000 : sqm <= 100 ? 150000 : sqm <= 200 ? 400000 : 1000000)

function makeCidcoPlots(): CidcoPlot[] {
  const out: CidcoPlot[] = []
  for (let i = 1; i <= 96; i++) {
    const sector = 1 + ((i - 1) % 12)
    const r = rnd()
    const allottedUse = r < 0.7 ? 'residential' : r < 0.9 ? 'commercial' : 'institutional'
    const areaSqm = allottedUse === 'residential' ? between(40, 300) : between(80, 600)
    const permittedBua = Math.round(areaSqm * (allottedUse === 'commercial' ? 1.5 : 1.0) * 10.764)
    const built = rnd() < 0.88
    const p: CidcoPlot = {
      id: `CP-MH-NMN-2026-${pad(i, 5)}`,
      sector, plotNo: `${between(1, 140)}`,
      allottee: personName(), allottedUse, areaSqm,
      leaseFrom: dateBack(between(800, 9000)),
      permittedBua,
      builtBua: built ? Math.round(permittedBua * (rnd() < 0.18 ? 1.15 + rnd() * 0.4 : 0.8 + rnd() * 0.2)) : null,
      arrears: rnd() < 0.22 ? between(2, 40) * 5000 : 0,
      flags: [], estCharges: 0,
    }
    if (rnd() < 0.3) {
      p.igrSale = { docNo: `IGR/${between(2022, 2026)}/${pad(between(1, 99999), 5)}`, date: dateBack(between(20, 900)), buyer: personName() }
      if (rnd() < 0.55) p.transferNoc = `CIDCO/EST/TR/${pad(between(1, 9999), 4)}`
    }
    if (built) p.elecCategory = allottedUse === 'residential' && rnd() < 0.14 ? 'LT-II व्यावसायिक' : allottedUse === 'residential' ? 'LT-I निवासी' : 'LT-II व्यावसायिक'
    if (p.igrSale && !p.transferNoc) { p.flags.push('C1'); p.estCharges += cidcoTransferCharge(areaSqm) }
    if (allottedUse === 'residential' && p.elecCategory === 'LT-II व्यावसायिक') { p.flags.push('C2'); p.estCharges += Math.round(areaSqm * 2500 / 100) * 100 }
    if (p.builtBua && p.builtBua > permittedBua * 1.1) { p.flags.push('C3'); p.estCharges += Math.round((p.builtBua - permittedBua) * 450 / 100) * 100 }
    if (p.arrears) { p.flags.push('C4'); p.estCharges += p.arrears }
    if (!built && rnd() < 0.8) { p.flags.push('C5'); p.estCharges += Math.round(areaSqm * 300 / 100) * 100 }
    out.push(p)
  }
  return out
}
export const CIDCO_PLOTS: CidcoPlot[] = makeCidcoPlots()
