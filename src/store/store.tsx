import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuditEntry, Case, Lang, Persona, Visit } from '../data/types'
import { INITIAL_AUDIT, INITIAL_CASES, PERSONAS, TODAY } from '../data/mock'

export interface Upload { at: string; source: string; file: string; records: number; by: string }
export interface SentMessage { at: string; channel: 'SMS' | 'WhatsApp'; to: string; template: string; caseId: string }
export interface MatchRun { at: string; by: string; found: number; newCases: number }

interface State {
  personaId: string | null
  lang: Lang
  cases: Case[]
  audit: AuditEntry[]
  uploads: Upload[]
  messages: SentMessage[]
  runs: MatchRun[]
}

const KEY = 'maha-passport-demo-v1'

const initial = (): State => ({
  personaId: null,
  lang: 'mr',
  cases: INITIAL_CASES,
  audit: INITIAL_AUDIT,
  uploads: [
    { at: '2026-09-28 11:20', source: 'tax', file: 'property_tax_register_sep2026.xlsx', records: 0, by: 'u_admin' },
    { at: '2026-09-30 16:05', source: 'elec', file: 'msedcl_consumers_nmn.csv', records: 0, by: 'u_do' },
  ],
  messages: [],
  runs: [{ at: '2026-10-01 06:00', by: 'system', found: INITIAL_CASES.length, newCases: 37 }],
})

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...initial(), ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return initial()
}

const now = () => {
  const d = new Date()
  return `${TODAY} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function useStoreValue() {
  const [s, setS] = useState<State>(load)
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ }
  }, [s])

  const persona: Persona | null = PERSONAS.find(p => p.id === s.personaId) ?? null

  const log = (st: State, action: string, entity: string): AuditEntry[] => {
    if (!persona) return st.audit
    return [{ at: now(), who: persona.id, role: persona.role, action, entity }, ...st.audit]
  }

  const updateCase = (id: string, patch: Partial<Case>, action: string) =>
    setS(st => ({
      ...st,
      cases: st.cases.map(c => (c.id === id ? { ...c, ...patch } : c)),
      audit: log(st, action, id),
    }))

  return {
    ...s,
    persona,
    t: (mr: string, en: string) => (s.lang === 'mr' ? mr : en),
    setLang: (lang: Lang) => setS(st => ({ ...st, lang })),
    login: (personaId: string) => setS(st => ({ ...st, personaId })),
    logout: () => setS(st => ({ ...st, personaId: null })),
    reset: () => {
      const keep = { personaId: s.personaId, lang: s.lang }
      setS({ ...initial(), ...keep })
    },
    assign: (id: string, inspectorId: string) =>
      updateCase(id, { status: 'assigned', assignedTo: inspectorId }, 'प्रकरण निरीक्षकाकडे सोपवले'),
    submitVisit: (id: string, visit: Visit) =>
      updateCase(id, { status: visit.exists ? 'verified' : 'not_found', visit }, 'प्रत्यक्ष पाहणी नोंदवली'),
    approve: (id: string, demand: number) => {
      const n = Math.floor(1000 + Math.random() * 8999)
      updateCase(id, { status: 'notice_sent', approvedDemand: demand, noticeNo: `NOT/NMN/2026/${n}`, noticeDate: TODAY }, 'आकारणी मंजूर, नोटीस पाठवली')
      setS(st => ({
        ...st,
        messages: [{ at: now(), channel: 'SMS', to: 'मालमत्ताधारक', template: 'नोटीस सूचना', caseId: id }, { at: now(), channel: 'WhatsApp', to: 'मालमत्ताधारक', template: 'नोटीस सूचना', caseId: id }, ...st.messages],
      }))
    },
    dismiss: (id: string) => updateCase(id, { status: 'closed' }, 'प्रकरण बंद केले (कारवाई नाही)'),
    fileObjection: (id: string, text: string) =>
      updateCase(id, { status: 'objection', objection: { date: TODAY, text } }, 'नागरिकाने हरकत नोंदवली'),
    decideObjection: (id: string, upheld: boolean, note: string, revisedDemand?: number) =>
      setS(st => ({
        ...st,
        cases: st.cases.map(c => c.id !== id ? c : {
          ...c,
          status: 'notice_sent',
          approvedDemand: upheld && revisedDemand !== undefined ? revisedDemand : c.approvedDemand,
          objection: c.objection && { ...c.objection, decision: upheld ? 'upheld' : 'rejected', decisionDate: TODAY, decisionNote: note },
        }),
        audit: log(st, upheld ? 'हरकत मान्य, मागणी सुधारली' : 'हरकत फेटाळली', id),
      })),
    recordPayment: (id: string) =>
      setS(st => ({
        ...st,
        cases: st.cases.map(c => (c.id === id ? { ...c, status: 'recovered', recovered: c.approvedDemand } : c)),
        audit: log(st, 'वसुली नोंदवली', id),
      })),
    addUpload: (u: Omit<Upload, 'at' | 'by'>) =>
      setS(st => ({ ...st, uploads: [{ ...u, at: now(), by: persona?.id ?? 'system' }, ...st.uploads], audit: log(st, 'विभागाचा data upload केला', u.file) })),
    addRun: (found: number) =>
      setS(st => ({ ...st, runs: [{ at: now(), by: persona?.id ?? 'system', found, newCases: 0 }, ...st.runs], audit: log(st, 'जुळवणी चालवली', 'Matching') })),
  }
}

type Store = ReturnType<typeof useStoreValue>
const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const v = useStoreValue()
  const value = useMemo(() => v, [v])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('StoreProvider missing')
  return v
}
