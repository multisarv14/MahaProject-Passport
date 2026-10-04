import { useState, type ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BarChart3, Bell, Building2, ClipboardList, Database, FileSearch, Gavel, GitMerge, Landmark, LayoutDashboard,
  LogOut, Map, Menu, ScrollText, Settings, ShieldCheck, Smartphone, Store, Users, Wallet, FileText,
} from 'lucide-react'
import { useStore } from '../store/store'
import { CITY } from '../data/mock'
import { useApi } from '../api/useApi'
import { ROLES } from '../lib/labels'
import type { RoleId } from '../data/types'
import { cx } from './ui'

type Item = { to: string; mr: string; en: string; icon: ReactNode; roles: RoleId[] | 'all' }
type Group = { mr: string; en: string; items: Item[] }

const OFFICIALS: RoleId[] = ['platform_admin', 'commissioner', 'assessment_officer', 'ward_officer', 'hearing_officer', 'recovery_clerk', 'auditor']

export const NAV: Group[] = [
  {
    mr: 'मुख्य', en: 'Main', items: [
      { to: '/', mr: 'Dashboard', en: 'Dashboard', icon: <LayoutDashboard size={17} />, roles: 'all' },
      { to: '/registry', mr: 'Passport शोध', en: 'Passport Registry', icon: <FileSearch size={17} />, roles: OFFICIALS },
    ],
  },
  {
    mr: 'मालमत्ता Passport', en: 'Property Passport', items: [
      { to: '/sources', mr: 'विभागांचा data', en: 'Data Sources', icon: <Database size={17} />, roles: ['platform_admin', 'dept_data_officer', 'commissioner', 'assessment_officer'] },
      { to: '/matching', mr: 'जुळवणी', en: 'Matching', icon: <GitMerge size={17} />, roles: ['platform_admin', 'commissioner', 'assessment_officer'] },
      { to: '/cases', mr: 'संशयित प्रकरणे', en: 'Cases', icon: <ClipboardList size={17} />, roles: OFFICIALS },
      { to: '/field', mr: 'प्रत्यक्ष पाहणी (Mobile)', en: 'Field App (Mobile)', icon: <Smartphone size={17} />, roles: ['inspector', 'ward_officer', 'platform_admin'] },
      { to: '/objections', mr: 'हरकती', en: 'Objections', icon: <Gavel size={17} />, roles: ['hearing_officer', 'assessment_officer', 'commissioner', 'platform_admin'] },
      { to: '/recovery', mr: 'वसुली', en: 'Recovery', icon: <Wallet size={17} />, roles: ['recovery_clerk', 'assessment_officer', 'commissioner', 'platform_admin'] },
    ],
  },
  {
    mr: 'नेतृत्व', en: 'Leadership', items: [
      { to: '/district', mr: 'जिल्हा Dashboard', en: 'District Dashboard', icon: <Map size={17} />, roles: ['collector', 'state_lead', 'commissioner', 'platform_admin'] },
      { to: '/state', mr: 'राज्य Dashboard', en: 'State Dashboard', icon: <Landmark size={17} />, roles: ['state_lead', 'platform_admin'] },
      { to: '/area', mr: 'क्षेत्र सारांश', en: 'Area Summary', icon: <BarChart3 size={17} />, roles: ['representative', 'platform_admin'] },
    ],
  },
  {
    mr: 'इतर Passport', en: 'Other Passports', items: [
      { to: '/business', mr: 'व्यवसाय Passport', en: 'Business Passport', icon: <Store size={17} />, roles: ['business_officer', 'commissioner', 'collector', 'platform_admin'] },
      { to: '/project', mr: 'प्रकल्प Passport', en: 'Project Passport', icon: <Building2 size={17} />, roles: ['commissioner', 'collector', 'state_lead', 'platform_admin'] },
    ],
  },
  {
    mr: 'इतर', en: 'More', items: [
      { to: '/reports', mr: 'अहवाल', en: 'Reports', icon: <FileText size={17} />, roles: ['platform_admin', 'commissioner', 'assessment_officer', 'collector', 'state_lead', 'recovery_clerk', 'auditor'] },
      { to: '/notifications', mr: 'सूचना (SMS / WhatsApp)', en: 'Notifications', icon: <Bell size={17} />, roles: ['platform_admin', 'commissioner', 'assessment_officer'] },
      { to: '/audit', mr: 'Audit Log', en: 'Audit Log', icon: <ScrollText size={17} />, roles: ['auditor', 'platform_admin', 'commissioner'] },
      { to: '/admin', mr: 'प्रशासन', en: 'Administration', icon: <Settings size={17} />, roles: ['platform_admin'] },
    ],
  },
]

export function Layout() {
  const { persona, lang, setLang, t, demoLogin, logout } = useStore()
  const { data: demoUsers } = useApi<{ id: string; name: string; role: RoleId }[]>('/demo/users')
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  if (!persona) return null
  const groups = NAV.map(g => ({ ...g, items: g.items.filter(i => i.roles === 'all' || i.roles.includes(persona.role)) })).filter(g => g.items.length)

  return (
    <div className="flex h-full">
      <aside className={cx('fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-y-auto bg-ink text-white transition-transform lg:static lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-file" size={22} />
            <div>
              <div className="font-display text-lg leading-tight">महा पासपोर्ट</div>
              <div className="text-[11px] text-white/60">{t(CITY.mr, CITY.en)}</div>
            </div>
          </div>
        </div>
        <nav className="flex flex-col gap-4 px-2 py-4">
          {groups.map(g => (
            <div key={g.en}>
              <div className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-white/45 uppercase">{t(g.mr, g.en)}</div>
              {g.items.map(i => (
                <NavLink key={i.to} to={i.to} end={i.to === '/'} onClick={() => setOpen(false)}
                  className={({ isActive }) => cx('flex items-center gap-2.5 rounded px-3 py-2 text-[14px]', isActive ? 'bg-white/12 font-semibold text-white' : 'text-white/75 hover:bg-white/5 hover:text-white')}>
                  {i.icon}{t(i.mr, i.en)}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="mx-4 mb-4 rounded border border-white/15 p-3 text-[11px] leading-snug text-white/60">
          {t('हे Demo आहे. शहर, व्यक्ती आणि सर्व नोंदी काल्पनिक आहेत.', 'This is a demo. The city, people and all records are fictional.')}
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-line bg-white px-4 py-2">
          <button className="rounded p-1.5 hover:bg-paper lg:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu size={20} /></button>
          {demoUsers && <span className="rounded bg-file-soft px-2 py-0.5 text-xs font-bold text-file">DEMO</span>}
          <div className="flex-1" />
          {demoUsers ? (
            <label className="flex items-center gap-2 text-sm" title={t('Demo: भूमिका बदला', 'Demo: switch role')}>
              <Users size={16} className="text-muted" />
              <select aria-label="Role" className="max-w-[16rem] rounded border border-line bg-white px-2 py-1 text-sm"
                value={persona.id} onChange={async e => { const id = e.target.value; await demoLogin(id); nav(id === 'u_cit' ? '/citizen' : '/') }}>
                {demoUsers.map(p => <option key={p.id} value={p.id}>{ROLES[p.role][lang]} · {p.name}</option>)}
              </select>
            </label>
          ) : (
            <span className="text-sm"><b>{persona.name}</b> · {ROLES[persona.role][lang]}</span>
          )}
          <div className="flex overflow-hidden rounded border border-line text-sm">
            {(['mr', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} className={cx('px-2 py-1', lang === l ? 'bg-ink text-white' : 'bg-white')}>{l === 'mr' ? 'मराठी' : 'EN'}</button>
            ))}
          </div>
          <button title={t('बाहेर पडा', 'Log out')} className="rounded p-1.5 text-muted hover:bg-paper" onClick={() => { logout(); nav('/login') }}><LogOut size={17} /></button>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl"><Outlet /></div>
        </main>
      </div>
    </div>
  )
}
