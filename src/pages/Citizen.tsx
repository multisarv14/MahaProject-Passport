import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, ShieldCheck } from 'lucide-react'
import { useStore } from '../store/store'
import { CITY } from '../data/mock'
import { USAGE } from '../lib/labels'
import { inr, num, dmy } from '../lib/format'
import { api } from '../api/client'
import { useApi } from '../api/useApi'
import { toCase, toProperty } from '../api/adapters'
import type { ApiCase, ApiProperty } from '../api/types'
import { Button, Card, Field, KV, LoadError, Loading, Modal, Notice, StatusBadge, inputCls, cx } from '../components/ui'
import { NoticeLetter } from '../components/NoticeLetter'

export default function Citizen() {
  const { t, lang, setLang, persona, logout } = useStore()
  const nav = useNavigate()
  const mine = useApi<{ propertyId: string; caseId: string | null } | null>('/citizen/my-property')
  const prop = useApi<ApiProperty>(mine.data ? `/properties/${mine.data.propertyId}` : null)
  const cs = useApi<ApiCase>(mine.data?.caseId ? `/cases/${mine.data.caseId}` : null)
  const [showNotice, setShowNotice] = useState(false)
  const [objText, setObjText] = useState('')
  const [objOpen, setObjOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const act = async (path: string, body: unknown = {}) => {
    if (!cs.data) return
    setBusy(true); setErr('')
    try { await api(`/cases/${cs.data.id}/${path}`, { method: 'POST', body }); cs.reload(); setObjOpen(false) }
    catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const error = mine.error ?? prop.error ?? cs.error
  const p = prop.data ? toProperty(prop.data) : null
  const c = cs.data ? toCase(cs.data) : null

  return (
    <div className="min-h-full bg-paper">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
          <ShieldCheck className="text-file" size={20} />
          <div className="flex-1"><div className="font-display text-lg leading-tight">{t('माझी मालमत्ता', 'My Property')}</div><div className="text-xs text-white/60">{t(CITY.mr, CITY.en)} · {persona?.name}</div></div>
          <div className="flex overflow-hidden rounded border border-white/30 text-sm">
            {(['mr', 'en'] as const).map(l => <button key={l} onClick={() => setLang(l)} className={cx('px-2 py-1', lang === l ? 'bg-white text-ink' : '')}>{l === 'mr' ? 'मराठी' : 'EN'}</button>)}
          </div>
          <button title={t('बाहेर पडा', 'Log out')} onClick={() => { logout(); nav('/login') }}><LogOut size={18} /></button>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        {error && <LoadError message={error} />}
        {mine.data === null && <Notice tone="info">{t('आपल्या मोबाईल क्रमांकाशी कोणतीही मालमत्ता जोडलेली नाही.', 'No property is linked to your mobile number.')}</Notice>}
        {!error && mine.data !== null && !p && <Loading />}
        {err && <Notice tone="bad">{err}</Notice>}

        {p && (
          <Card title={t('मालमत्तेचा तपशील', 'Property details')}>
            <KV items={[
              ['Passport ID', <span className="font-mono">{p.id}</span>], [t('मालक', 'Owner'), p.owner], [t('पत्ता', 'Address'), p.address],
              [t('वापर', 'Usage'), USAGE[p.usage][lang]], [t('कर क्रमांक', 'Tax number'), p.tax?.taxNo ?? t('नवीन आकारणी प्रक्रियेत', 'New assessment in progress')],
              [t('वार्षिक कर', 'Annual tax'), p.tax ? inr(p.tax.annualTax) : '—'],
            ]} />
          </Card>
        )}

        {p && c && (
          <Card title={t('नोटीस', 'Notice')} action={<StatusBadge status={c.status} />}>
            <div className="flex flex-col gap-3 text-sm">
              <p>{t('नोटीस क्र.', 'Notice no.')} <b className="font-mono">{c.noticeNo}</b> · {dmy(c.noticeDate)}</p>
              <p>{t('मागणी', 'Demand')}: <b className="tnum text-lg">{inr(c.approvedDemand ?? 0)}</b> · {t('पाहणीत मोजलेले क्षेत्रफळ', 'Area measured on site')}: {num(c.visit?.measuredArea ?? 0)} {t('चौ.फूट', 'sq ft')}</p>
              {c.objection && <Notice tone={c.objection.decision ? 'info' : 'warn'}>{t('आपली हरकत', 'Your objection')} ({dmy(c.objection.date)}): {c.objection.decision ? (c.objection.decision === 'upheld' ? t('मान्य झाली.', 'upheld.') : t('फेटाळली.', 'rejected.')) + ' ' + (c.objection.decisionNote ?? '') : t('सुनावणीसाठी प्रलंबित.', 'pending hearing.')}</Notice>}
              {c.status === 'recovered' && <Notice tone="ok">{t('भरणा प्राप्त. धन्यवाद.', 'Payment received. Thank you.')}</Notice>}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setShowNotice(true)}>{t('नोटीस पहा', 'View notice')}</Button>
                {c.status === 'notice_sent' && <Button disabled={busy} onClick={() => act('payment')}>{t('ऑनलाईन भरा (Demo)', 'Pay online (demo)')}</Button>}
                {c.status === 'notice_sent' && !c.objection && <Button variant="secondary" onClick={() => setObjOpen(true)}>{t('हरकत नोंदवा', 'File objection')}</Button>}
              </div>
            </div>
          </Card>
        )}
        {p && mine.data && !mine.data.caseId && <Notice tone="ok">{t('या मालमत्तेवर कोणतीही प्रलंबित नोटीस नाही.', 'No pending notice on this property.')}</Notice>}

        {p && (
          <Card title={t('SMS / WhatsApp सूचना', 'SMS / WhatsApp alerts')}>
            <div className="max-w-sm rounded-lg bg-[#E7F6E1] p-3 text-sm">{t(`नमस्कार, आपल्या मालमत्तेबाबत (Passport ${p.id}) सूचना या क्रमांकावर मिळतील. — नमुनानगर महानगरपालिका`, `Hello, alerts about your property (Passport ${p.id}) will be sent to this number. — Namunanagar Municipal Corporation`)}</div>
          </Card>
        )}
      </main>

      {p && c && <Modal open={showNotice} onClose={() => setShowNotice(false)} title={t('मागणी नोटीस', 'Demand notice')} wide><NoticeLetter c={c} p={p} /></Modal>}
      {c && (
        <Modal open={objOpen} onClose={() => setObjOpen(false)} title={t('हरकत नोंदवा', 'File an objection')}>
          <form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); act('objection', { text: objText || t('क्षेत्रफळ जास्त दाखवले आहे. पुन्हा मोजणी करावी.', 'Area is overstated. Please re-measure.') }) }}>
            <Field label={t('हरकतीचे कारण', 'Reason')}>
              <textarea id="obj-text" rows={4} className={inputCls} value={objText} onChange={e => setObjText(e.target.value)} placeholder={t('उदा. क्षेत्रफळ जास्त दाखवले आहे.', 'e.g. Area is overstated.')} />
            </Field>
            <p className="text-xs text-muted">{t('सुनावणीची तारीख SMS / WhatsApp वर कळवली जाईल.', 'Hearing date will be sent by SMS / WhatsApp.')}</p>
            <Button type="submit" disabled={busy}>{t('हरकत पाठवा', 'Submit objection')}</Button>
          </form>
        </Modal>
      )}
    </div>
  )
}
