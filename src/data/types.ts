export type Lang = 'mr' | 'en'

export type RoleId =
  | 'platform_admin'
  | 'state_lead'
  | 'collector'
  | 'commissioner'
  | 'assessment_officer'
  | 'ward_officer'
  | 'inspector'
  | 'hearing_officer'
  | 'recovery_clerk'
  | 'dept_data_officer'
  | 'auditor'
  | 'representative'
  | 'business_officer'
  | 'citizen'

export interface Persona {
  id: string
  name: string
  role: RoleId
  office: string
  ward?: number
}

export type Usage = 'residential' | 'commercial' | 'mixed'

export interface TaxRecord {
  taxNo: string
  owner: string
  usage: Usage
  assessedArea: number
  annualTax: number
  lastPaid: string
  arrears: number
}

export interface OcRecord {
  ocNo: string
  date: string
  builtUpArea: number
  units: number
  authority: string
}

export interface ElecRecord {
  consumerNo: string
  category: 'LT-I निवासी' | 'LT-II व्यावसायिक'
  since: string
  avgMonthlyUnits: number
}

export interface IgrRecord {
  docNo: string
  date: string
  buyer: string
  seller: string
}

export interface WaterRecord {
  connNo: string
  since: string
  billed: boolean
}

export interface Property {
  id: string
  ward: number
  address: string
  owner: string
  usage: Usage
  area: number
  x: number
  y: number
  tax?: TaxRecord
  oc?: OcRecord
  elec?: ElecRecord
  igr?: IgrRecord
  water?: WaterRecord
}

export type RuleId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6'

export type CaseStatus =
  | 'suspected'
  | 'assigned'
  | 'verified'
  | 'not_found'
  | 'notice_sent'
  | 'objection'
  | 'recovered'
  | 'closed'

export interface Visit {
  date: string
  by: string
  exists: boolean
  usageFound: Usage
  measuredArea: number
  photos: number
  gps: string
  remarks: string
}

export interface Objection {
  date: string
  text: string
  decision?: 'upheld' | 'rejected'
  decisionDate?: string
  decisionNote?: string
}

export interface Case {
  id: string
  propertyId: string
  rules: RuleId[]
  confidence: number
  status: CaseStatus
  estDemand: number
  approvedDemand?: number
  recovered?: number
  assignedTo?: string
  openedOn: string
  visit?: Visit
  noticeNo?: string
  noticeDate?: string
  objection?: Objection
}

export interface AuditEntry {
  at: string
  who: string
  role: RoleId
  action: string
  entity: string
}

export interface Business {
  id: string
  name: string
  type: string
  propertyId: string
  ward: number
  shopAct?: string
  ptNo?: string
  licence?: string
  gstin?: string
  elecCommercial: boolean
  flags: ('B1' | 'B2' | 'B3')[]
}
