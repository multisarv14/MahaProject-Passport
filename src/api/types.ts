import type { CaseStatus, RoleId, RuleId, Usage } from '../data/types'

export interface SessionUser { id: string; name: string; role: RoleId; wards: number[] | null; office?: string }

export interface ApiStats {
  properties: number
  byStatus: { status: CaseStatus; n: number; est: string; approved: string; recovered: string }[]
  byWard: { ward: number; cases: number; pending: number; confirmed: number; demand: string; recovered: string }[]
  byRule: { rule: RuleId; n: number }[]
}

export interface ApiCaseRow {
  id: string; property_id: string; rules: RuleId[]; confidence: number; status: CaseStatus
  est_demand: string; approved_demand: string | null; assigned_to: string | null; opened_on: string
  address: string; owner_name: string; ward: number; assigned_name: string | null
}

export interface ApiRecords { tax?: any; oc?: any; elec?: any; igr?: any; water?: any }

export interface ApiProperty {
  id: string; ward: number; address: string; owner_name: string; usage: Usage; area_sqft: number
  lat?: number; lng?: number; records?: ApiRecords; case_id?: string | null
}

export interface ApiCase {
  id: string; property_id: string; rules: RuleId[]; confidence: number; status: CaseStatus
  est_demand: string; approved_demand: string | null; recovered: string | null; assigned_to: string | null
  opened_on: string; notice_no: string | null; notice_date: string | null; ward: number; assigned_name: string | null
  property: ApiProperty; records: ApiRecords
  visit: null | { visited_on: string; visited_by: string; visited_by_name: string; structure_found: boolean; usage_found: Usage; measured_area: number; photos: number; lat: number; lng: number; remarks: string }
  objection: null | { filed_on: string; text: string; decision: 'upheld' | 'rejected' | null; decided_on: string | null; decision_note: string | null }
  activity: { at: string; action: string; who: string | null }[]
}

export interface ApiObjection {
  id: number; case_id: string; filed_on: string; text: string; decision: 'upheld' | 'rejected' | null
  decision_note: string | null; status: CaseStatus; approved_demand: string | null; owner_name: string; address: string
}

export interface ApiAudit { at: string; action: string; entity: string; role: RoleId | null; who: string | null }
