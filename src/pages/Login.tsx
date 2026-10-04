import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useStore } from '../store/store'
import { PERSONAS } from '../data/mock'
import { ROLES } from '../lib/labels'
import { Button, Field, inputCls, cx } from '../components/ui'

const GROUPS: { mr: string; en: string; roles: string[] }[] = [
  { mr: 'नेतृत्व', en: 'Leadership', roles: ['state_lead', 'collector', 'commissioner', 'representative'] },
  { mr: 'महानगरपालिका अधिकारी', en: 'Municipal officers', roles: ['assessment_officer', 'ward_officer', 'inspector', 'hearing_officer', 'recovery_clerk'] },
  { mr: 'विभाग व इतर', en: 'Departments & others', roles: ['dept_data_officer', 'business_officer', 'auditor', 'platform_admin'] },
  { mr: 'नागरिक', en: 'Citizen', roles: ['citizen'] },
]

export default function Login() {
  const { t, lang, setLang, login } = useStore()
  const nav = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [mobile, setMobile] = useState('98XXXXXX10')
  const [otp, setOtp] = useState('')
  const [sel, setSel] = useState('u_comm')

  return (
    <div className="grid min-h-full lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col justify-between bg-ink p-8 text-white lg:p-12">
        <div className="flex items-center gap-2"><ShieldCheck className="text-file" /> <span className="font-semibold">MultiSarv Pvt. Ltd.</span></div>
        <div className="py-10">
          <div className="text-sm font-semibold tracking-wide text-file uppercase">{t('Demo · चर्चेसाठी', 'Demo · For discussion')}</div>
          <h1 className="mt-2 font-display text-4xl leading-tight lg:text-5xl">महा पासपोर्ट</h1>
          <p className="mt-4 max-w-md text-lg text-white/75">{t('विभागांचा data जोडून शासनाचा हरवलेला महसूल शोधणारी प्रणाली.', 'Connecting department data to find government revenue that is being missed.')}</p>
          <div className="mt-6 inline-block border border-white/40 px-3 py-1.5 font-mono text-sm tracking-wider">MP-MH-NMN-2026-000123</div>
        </div>
        <p className="text-xs text-white/50">{t('सर्व शहरे, व्यक्ती आणि नोंदी काल्पनिक आहेत.', 'All cities, people and records are fictional.')}</p>
      </div>

      <div className="flex items-center justify-center bg-white p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-end gap-1 text-sm">
            {(['mr', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} className={cx('rounded px-2 py-1', lang === l ? 'bg-ink text-white' : 'border border-line')}>{l === 'mr' ? 'मराठी' : 'English'}</button>
            ))}
          </div>
          <h2 className="font-display text-2xl">{t('प्रवेश करा', 'Sign in')}</h2>

          {step === 1 && (
            <form className="mt-6 flex flex-col gap-4" onSubmit={e => { e.preventDefault(); setStep(2) }}>
              <Field label={t('मोबाईल क्रमांक', 'Mobile number')}>
                <input id="mobile" className={inputCls} value={mobile} onChange={e => setMobile(e.target.value)} />
              </Field>
              <Button type="submit">{t('OTP पाठवा', 'Send OTP')}</Button>
            </form>
          )}

          {step === 2 && (
            <form className="mt-6 flex flex-col gap-4" onSubmit={e => { e.preventDefault(); setStep(3) }}>
              <p className="text-sm text-muted">{t(`${mobile} वर OTP पाठवला आहे. Demo साठी कोणताही ६ अंकी क्रमांक चालेल.`, `OTP sent to ${mobile}. Any 6 digits work in the demo.`)}</p>
              <Field label="OTP">
                <input id="otp" inputMode="numeric" maxLength={6} className={cx(inputCls, 'tracking-[0.5em]')} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} autoFocus />
              </Field>
              <Button type="submit" disabled={otp.length !== 6}>{t('पडताळा', 'Verify')}</Button>
            </form>
          )}

          {step === 3 && (
            <div className="mt-6">
              <p className="mb-3 text-sm text-muted">{t('Demo साठी भूमिका निवडा', 'Choose a role for the demo')}</p>
              <div className="flex max-h-[55vh] flex-col gap-4 overflow-y-auto pr-1">
                {GROUPS.map(g => (
                  <div key={g.en}>
                    <div className="mb-1.5 text-xs font-semibold text-muted uppercase">{t(g.mr, g.en)}</div>
                    <div className="grid gap-1.5">
                      {PERSONAS.filter(p => g.roles.includes(p.role)).map(p => (
                        <label key={p.id} className={cx('flex cursor-pointer items-center gap-3 rounded border px-3 py-2', sel === p.id ? 'border-ink bg-paper' : 'border-line')}>
                          <input type="radio" name="persona" checked={sel === p.id} onChange={() => setSel(p.id)} />
                          <span className="flex flex-col">
                            <span className="font-semibold">{ROLES[p.role][lang]}</span>
                            <span className="text-xs text-muted">{p.name} · {p.office}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Button className="mt-4 w-full" onClick={() => { login(sel); nav(sel === 'u_cit' ? '/citizen' : '/') }}>{t('पुढे जा', 'Continue')}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
