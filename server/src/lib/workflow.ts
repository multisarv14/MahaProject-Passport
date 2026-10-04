// Case lifecycle: which action moves a case from which status, and who may do it.
// Kept free of I/O so it can be unit-tested and reviewed on its own.

export type Role =
  | 'platform_admin' | 'state_lead' | 'collector' | 'commissioner' | 'assessment_officer'
  | 'ward_officer' | 'inspector' | 'hearing_officer' | 'recovery_clerk' | 'dept_data_officer'
  | 'auditor' | 'representative' | 'business_officer' | 'citizen'

export type Status = 'suspected' | 'assigned' | 'verified' | 'not_found' | 'notice_sent' | 'objection' | 'recovered' | 'closed'

export type Action = 'assign' | 'visit_found' | 'visit_not_found' | 'approve' | 'close' | 'file_objection' | 'decide_objection' | 'record_payment'

interface Transition { from: Status[]; to: Status; roles: Role[] }

export const TRANSITIONS: Record<Action, Transition> = {
  assign: { from: ['suspected'], to: 'assigned', roles: ['ward_officer', 'assessment_officer', 'commissioner'] },
  visit_found: { from: ['assigned'], to: 'verified', roles: ['inspector'] },
  visit_not_found: { from: ['assigned'], to: 'not_found', roles: ['inspector'] },
  approve: { from: ['verified'], to: 'notice_sent', roles: ['assessment_officer', 'commissioner'] },
  close: { from: ['verified', 'not_found'], to: 'closed', roles: ['assessment_officer', 'commissioner'] },
  file_objection: { from: ['notice_sent'], to: 'objection', roles: ['citizen'] },
  decide_objection: { from: ['objection'], to: 'notice_sent', roles: ['hearing_officer'] },
  record_payment: { from: ['notice_sent'], to: 'recovered', roles: ['recovery_clerk', 'assessment_officer', 'citizen'] },
}

export type Check = { ok: true; to: Status } | { ok: false; code: 'FORBIDDEN_ROLE' | 'INVALID_STATUS'; message: string }

export function checkTransition(action: Action, role: Role, current: Status): Check {
  const t = TRANSITIONS[action]
  if (!t.roles.includes(role)) {
    return { ok: false, code: 'FORBIDDEN_ROLE', message: `Role ${role} cannot ${action}` }
  }
  if (!t.from.includes(current)) {
    return { ok: false, code: 'INVALID_STATUS', message: `Cannot ${action} a case in status ${current}` }
  }
  return { ok: true, to: t.to }
}

/**
 * Roles that may read individual property and case records (with personal data).
 * platform_admin is deliberately absent: the vendor's administrator manages users and
 * the system, and never sees government or citizen data.
 */
export const CASE_READERS: Role[] = [
  'commissioner', 'assessment_officer', 'ward_officer', 'inspector',
  'hearing_officer', 'recovery_clerk', 'auditor',
]

/** Roles that administer the platform only (users, offices, system health). */
export const SYSTEM_ADMINS: Role[] = ['platform_admin']

/** Roles that only see aggregate figures. */
export const AGGREGATE_ONLY: Role[] = ['state_lead', 'collector', 'representative']
