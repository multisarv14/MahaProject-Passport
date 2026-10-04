import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useStore } from '../store/store'
import { api } from '../api/client'
import { useApi } from '../api/useApi'
import type { SessionUser } from '../api/types'
import type { RoleId } from '../data/types'
import { ROLES } from '../lib/labels'
import { Button, Field, Notice, inputCls, cx } from '../components/ui'

const GROUPS: { mr: string; en: string; roles: RoleId[] }[] = [
  { mr: 'नेतृत्व', en: 'Leadership', roles: ['state_lead', 'collector', 'commissioner', 'representative'] },
  { mr: 'महानगरपालिका अधिकारी', en: 'Municipal officers', roles: ['assessment_officer', 'ward_officer', 'inspector', 'hearing_officer', 'recovery_clerk'] },
  { mr: 'विभाग व इतर', en: 'Departments & others', roles: ['dept_data_officer', 'business_officer', 'auditor', 'platform_admin'] },
  { mr: 'नागरिक', en: 'Citizen', roles: ['citizen'] },
]

interface DemoUser { id: string; name: string; role: RoleId; office: string; mobile: string }

export default function Login() {
  const { t, lang, setLang, signIn, demoLogin } = useStore()
  const nav = useNavigate()
  const { data: demoUsers } = useApi<DemoUser[]>('/demo/users')
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile')
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [devCode, setDevCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sel, setSel] = useState('u_comm')

  const go = (u: SessionUser) => nav(u.role === 'citizen' ? '/citizen' : '/')

  const sendOtp = async () => {
    setBusy(true); setError('')
    try {
      const r = await api<{ sent: boolean; devCode?: string }>('/auth/otp', { method: 'POST', body: { mobile } })
      setDevCode(r.devCode ?? ''); setStep('otp')
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const verify = async () => {
    setBusy(true); setError('')
    try {
      const r = await api<{ token: string; user: SessionUser }>('/auth/verify', { method: 'POST', body: { mobile, code: otp } })
      signIn(r); go(r.user)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const quick = async () => {
    setBusy(true); setError('')
    try { await demoLogin(sel); nav(sel === 'u_cit' ? '/citizen' : '/') } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className="grid min-h-full lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col justify-between bg-ink p-8 text-white lg:p-12">
        <div className="flex items-center gap-2"><ShieldCheck className="text-file" /> <span className="font-semibold">MultiSarv Pvt. Ltd.</span></div>
        <div className="py-10">
          {demoUsers && <div className="text-sm font-semibold tracking-wide text-file uppercase">{t('Demo · चर्चेसाठी', 'Demo · For discussion')}</div>}
          <h1 className="mt-2 font-display text-4xl leading-tight lg:text-5xl">महा पासपोर्ट</h1>
          <p className="mt-4 max-w-md text-lg text-white/75">{t('विभागांचा data जोडून शासनाचा हरवलेला महसूल शोधणारी प्रणाली.', 'Connecting department data to find government revenue that is being missed.')}</p>
          <div className="mt-6 inline-block border border-white/40 px-3 py-1.5 font-mono text-sm tracking-wider">MP-MH-NMN-2026-000123</div>
        </div>
        {demoUsers && <p className="text-xs text-white/50">{t('सर्व शहरे, व्यक्ती आणि नोंदी काल्पनिक आहेत.', 'All cities, people and records are fictional.')}</p>}
      </div>

      <div className="flex items-center justify-center bg-white p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-end gap-1 text-sm">
            {(['mr', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} className={cx('rounded px-2 py-1', lang === l ? 'bg-ink text-white' : 'border border-line')}>{l === 'mr' ? 'मराठी' : 'English'}</button>
            ))}
          </div>
          <h2 className="font-display text-2xl">{t('प्रवेश करा', 'Sign in')}</h2>
          {error && <div className="mt-4"><Notice tone="bad">{error}</Notice></div>}

          {step === 'mobile' && (
            <form className="mt-6 flex flex-col gap-4" onSubmit={e => { e.preventDefault(); sendOtp() }}>
              <Field label={t('नोंदणीकृत मोबाईल क्रमांक', 'Registered mobile number')}>
                <input id="mobile" inputMode="numeric" maxLength={10} className={inputCls} value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, ''))} placeholder="10 अंकी क्रमांक" />
              </Field>
              <Button type="submit" disabled={mobile.length !== 10 || busy}>{t('OTP पाठवा', 'Send OTP')}</Button>
            </form>
          )}

          {step === 'otp' && (
            <form className="mt-6 flex flex-col gap-4" onSubmit={e => { e.preventDefault(); verify() }}>
              <p className="text-sm text-muted">{t(`${mobile} वर OTP पाठवला आहे. तो ५ मिनिटे वैध आहे.`, `OTP sent to ${mobile}. It is valid for 5 minutes.`)}</p>
              {devCode && <Notice tone="file">{t('Demo: SMS ऐवजी OTP इथे दाखवला आहे: ', 'Demo: OTP shown here instead of SMS: ')}<b className="font-mono">{devCode}</b></Notice>}
              <Field label="OTP">
                <input id="otp" inputMode="numeric" maxLength={6} className={cx(inputCls, 'tracking-[0.5em]')} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} autoFocus />
              </Field>
              <Button type="submit" disabled={otp.length !== 6 || busy}>{t('पडताळा', 'Verify')}</Button>
              <button type="button" className="text-sm text-info underline" onClick={() => { setStep('mobile'); setOtp(''); setDevCode('') }}>{t('क्रमांक बदला', 'Change number')}</button>
            </form>
          )}

          {demoUsers && step === 'mobile' && (
            <div className="mt-8 border-t border-line pt-6">
              <p className="mb-3 text-sm font-semibold">{t('Demo: थेट भूमिका निवडा', 'Demo: pick a role directly')}</p>
              <div className="flex max-h-[42vh] flex-col gap-4 overflow-y-auto pr-1">
                {GROUPS.map(g => (
                  <div key={g.en}>
                    <div className="mb-1.5 text-xs font-semibold text-muted uppercase">{t(g.mr, g.en)}</div>
                    <div className="grid gap-1.5">
                      {demoUsers.filter(p => g.roles.includes(p.role)).map(p => (
                        <label key={p.id} className={cx('flex cursor-pointer items-center gap-3 rounded border px-3 py-2', sel === p.id ? 'border-ink bg-paper' : 'border-line')}>
                          <input type="radio" name="persona" checked={sel === p.id} onChange={() => setSel(p.id)} />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="font-semibold">{ROLES[p.role][lang]}</span>
                            <span className="truncate text-xs text-muted">{p.name} · {p.office}</span>
                          </span>
                          <button type="button" className="font-mono text-xs text-info" onClick={e => { e.preventDefault(); setMobile(p.mobile) }} title={t('हा क्रमांक OTP साठी वापरा', 'Use this number for OTP')}>{p.mobile}</button>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="secondary" className="mt-4 w-full" disabled={busy} onClick={quick}>{t('या भूमिकेने पुढे जा', 'Continue as this role')}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
