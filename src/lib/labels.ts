import type { CaseStatus, RoleId, RuleId, Usage } from '../data/types'

type Bi = { mr: string; en: string }

export const RULES: Record<RuleId, Bi & { short: Bi }> = {
  R1: { short: { mr: 'OC आहे, कर नाही', en: 'OC, no tax' }, mr: 'भोगवटा प्रमाणपत्र (OC) मिळाले, पण मालमत्ता कर नोंद नाही', en: 'Occupancy certificate issued, but no property tax record' },
  R2: { short: { mr: 'वीज आहे, कर नाही', en: 'Power, no tax' }, mr: 'वीज जोडणी आहे, पण मालमत्ता कर नोंद नाही', en: 'Electricity connection exists, but no property tax record' },
  R3: { short: { mr: 'व्यावसायिक वीज, निवासी कर', en: 'Commercial power, residential tax' }, mr: 'वीज व्यावसायिक दराने, पण कर निवासी दराने', en: 'Commercial electricity tariff, but taxed as residential' },
  R4: { short: { mr: 'मालक बदलला, नोंद नाही', en: 'Owner changed, not updated' }, mr: 'IGR मध्ये विक्री नोंदली, पण कर नोंदीत मालक बदललेला नाही', en: 'Sale registered with IGR, but tax record still shows old owner' },
  R5: { short: { mr: 'क्षेत्रफळ कमी आकारले', en: 'Area under-assessed' }, mr: 'OC मधील क्षेत्रफळ कर आकारणीतील क्षेत्रफळापेक्षा जास्त', en: 'Built-up area in OC is larger than assessed area' },
  R6: { short: { mr: 'पाणी आहे, कर नाही', en: 'Water, no tax' }, mr: 'नळ जोडणी आहे, पण मालमत्ता कर नोंद नाही', en: 'Water connection exists, but no property tax record' },
}

export const STATUS: Record<CaseStatus, Bi & { tone: Tone }> = {
  suspected: { mr: 'संशयित', en: 'Suspected', tone: 'warn' },
  assigned: { mr: 'पाहणीसाठी सोपवले', en: 'Assigned', tone: 'info' },
  verified: { mr: 'पाहणी पूर्ण', en: 'Verified', tone: 'info' },
  not_found: { mr: 'संशय चुकीचा', en: 'Not confirmed', tone: 'neutral' },
  notice_sent: { mr: 'नोटीस पाठवली', en: 'Notice sent', tone: 'file' },
  objection: { mr: 'हरकत', en: 'Objection', tone: 'bad' },
  recovered: { mr: 'वसूल', en: 'Recovered', tone: 'ok' },
  closed: { mr: 'बंद', en: 'Closed', tone: 'neutral' },
}

export const USAGE: Record<Usage, Bi> = {
  residential: { mr: 'निवासी', en: 'Residential' },
  commercial: { mr: 'व्यावसायिक', en: 'Commercial' },
  mixed: { mr: 'मिश्र', en: 'Mixed' },
}

export const ROLES: Record<RoleId, Bi> = {
  platform_admin: { mr: 'Platform Admin', en: 'Platform Admin' },
  state_lead: { mr: 'राज्य नेतृत्व', en: 'State Leadership' },
  collector: { mr: 'जिल्हाधिकारी', en: 'District Collector' },
  commissioner: { mr: 'आयुक्त', en: 'Municipal Commissioner' },
  assessment_officer: { mr: 'कर निर्धारण अधिकारी', en: 'Assessment Officer' },
  ward_officer: { mr: 'प्रभाग अधिकारी', en: 'Ward Officer' },
  inspector: { mr: 'कर निरीक्षक', en: 'Field Inspector' },
  hearing_officer: { mr: 'सुनावणी अधिकारी', en: 'Hearing Officer' },
  recovery_clerk: { mr: 'वसुली लिपिक', en: 'Recovery Clerk' },
  dept_data_officer: { mr: 'विभाग Data Officer', en: 'Department Data Officer' },
  auditor: { mr: 'लेखापरीक्षक', en: 'Auditor' },
  representative: { mr: 'लोकप्रतिनिधी', en: 'Elected Representative' },
  business_officer: { mr: 'व्यवसाय कर अधिकारी', en: 'Business Tax Officer' },
  citizen: { mr: 'नागरिक', en: 'Citizen' },
}

export const BIZ_FLAGS: Record<'B1' | 'B2' | 'B3', Bi> = {
  B1: { mr: 'व्यावसायिक वीज, पण दुकाने व आस्थापना नोंदणी नाही', en: 'Commercial power, no Shop Act registration' },
  B2: { mr: 'आस्थापना नोंदणी आहे, पण व्यवसाय कर (PT) नोंदणी नाही', en: 'Registered establishment, no Professional Tax enrolment' },
  B3: { mr: 'GST नोंदणीकृत पत्त्यावर व्यवसायाचा पुरावा नाही (State GST संदर्भ)', en: 'GST-registered address shows no business activity (State GST referral)' },
}

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'file' | 'neutral'
