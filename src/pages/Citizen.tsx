import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Search, ShieldCheck } from 'lucide-react'
import { useStore } from '../store/store'
import { CITIZEN_PROPERTY_ID, CITY, PROPERTIES, PROPERTY_BY_ID } from '../data/mock'
import { USAGE } from '../lib/labels'
import { inr, num, dmy } from '../lib/format'
import { Button, Card, Field, KV, Modal, Notice, StatusBadge, inputCls, cx } from '../components/ui'
import { NoticeLetter } from '../components/NoticeLetter'

export default function Citizen() {
  const st = useStore()
  const { t, lang, setLang, cases, persona, logout } = st
  const nav = useNavigate()
  const [q, setQ] = useState(persona?.role === 'citizen' ? CITIZEN_PROPERTY_ID : '')
  const [found, setFound] = useState<string | null>(persona?.role === 'citizen' ? CITIZEN_PROPERTY_ID : null)
  const [miss, setMiss] = useState(false)
  const [showNotice, setShowNotice] = useState(false)
  const [objText, setObjText] = useState('')
  const [objOpen, setObjOpen] = useState(false)

  const search = () => {
    const s = q.trim().toLowerCase()
    const p = PROPERTIES.find(x => x.id.toLowerCase() === s || x.tax?.taxNo.toLowerCase() === s)
    setFound(p?.id ?? null); setMiss(!p)
  }
  const p = found ? PROPERTY_BY_ID[found] : null
  const c = p ? cases.find(x => x.propertyId === p.id && x.noticeNo) : undefined

  return (
    <div className="min-h-full bg-paper">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
          <ShieldCheck className="text-file" size={20} />
          <div className="flex-1"><div className="font-display text-lg leading-tight">{t('माझी मालमत्ता', 'My Property')}</div><div className="text-xs text-white/60">{t(CITY.mr, CITY.en)} · {t('नागरिक सेवा (Demo)', 'Citizen services (demo)')}</div></div>
          <div className="flex overflow-hidden rounded border border-white/30 text-sm">
            {(['mr', 'en'] as const).map(l => <button key={l} onClick={() => setLang(l)} className={cx('px-2 py-1', lang === l ? 'bg-white text-ink' : '')}>{l === 'mr' ? 'मराठी' : 'EN'}</button>)}
          </div>
          {persona && <button title={t('बाहेर पडा', 'Log out')} onClick={() => { logout(); nav('/login') }}><LogOut size={18} /></button>}
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        <Card>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={e => { e.preventDefault(); search() }}>
            <div className="relative flex-1">
              <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <input id="cit-q" className={inputCls + ' w-full pl-9'} placeholder={t('Passport ID किंवा मालमत्ता कर क्रमांक', 'Passport ID or property tax number')} value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <Button type="submit">{t('शोधा', 'Search')}</Button>
          </form>
          {miss && <p className="mt-2 text-sm text-bad">{t('नोंद सापडली नाही. क्रमांक तपासून पुन्हा प्रयत्न करा.', 'No record found. Check the number and try again.')}</p>}
        </Card>

        {p && (
          <>
            <Card title={t('मालमत्तेचा तपशील', 'Property details')}>
              <KV items={[
                ['Passport ID', <span className="font-mono">{p.id}</span>], [t('मालक', 'Owner'), p.owner], [t('पत्ता', 'Address'), p.address],
                [t('वापर', 'Usage'), USAGE[p.usage][lang]], [t('कर क्रमांक', 'Tax number'), p.tax?.taxNo ?? t('नवीन आकारणी प्रक्रियेत', 'New assessment in progress')],
                [t('वार्षिक कर', 'Annual tax'), p.tax ? inr(p.tax.annualTax) : '—'],
              ]} />
            </Card>

            {c ? (
              <Card title={t('नोटीस', 'Notice')} action={<StatusBadge status={c.status} />}>
                <div className="flex flex-col gap-3 text-sm">
                  <p>{t('नोटीस क्र.', 'Notice no.')} <b className="font-mono">{c.noticeNo}</b> · {dmy(c.noticeDate)}</p>
                  <p>{t('मागणी', 'Demand')}: <b className="tnum text-lg">{inr(c.approvedDemand ?? 0)}</b> · {t('पाहणीत मोजलेले क्षेत्रफळ', 'Area measured on site')}: {num(c.visit?.measuredArea ?? 0)} {t('चौ.फूट', 'sq ft')}</p>
                  {c.objection && <Notice tone={c.objection.decision ? 'info' : 'warn'}>{t('आपली हरकत', 'Your objection')} ({dmy(c.objection.date)}): {c.objection.decision ? (c.objection.decision === 'upheld' ? t('मान्य झाली.', 'upheld.') : t('फेटाळली.', 'rejected.')) + ' ' + (c.objection.decisionNote ?? '') : t('सुनावणीसाठी प्रलंबित.', 'pending hearing.')}</Notice>}
                  {c.status === 'recovered' && <Notice tone="ok">{t('भरणा प्राप्त. धन्यवाद.', 'Payment received. Thank you.')}</Notice>}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setShowNotice(true)}>{t('नोटीस पहा', 'View notice')}</Button>
                    {c.status === 'notice_sent' && <Button onClick={() => st.recordPayment(c.id)}>{t('ऑनलाईन भरा (Demo)', 'Pay online (demo)')}</Button>}
                    {c.status === 'notice_sent' && !c.objection && <Button variant="secondary" onClick={() => setObjOpen(true)}>{t('हरकत नोंदवा', 'File objection')}</Button>}
                  </div>
                </div>
              </Card>
            ) : <Notice tone="ok">{t('या मालमत्तेवर कोणतीही प्रलंबित नोटीस नाही.', 'No pending notice on this property.')}</Notice>}

            <Card title={t('SMS / WhatsApp सूचना', 'SMS / WhatsApp alerts')}>
              <div className="max-w-sm rounded-lg bg-[#E7F6E1] p-3 text-sm">{t(`नमस्कार, आपल्या मालमत्तेबाबत (Passport ${p.id}) सूचना या क्रमांकावर मिळतील. — नमुनानगर महानगरपालिका`, `Hello, alerts about your property (Passport ${p.id}) will be sent to this number. — Namunanagar Municipal Corporation`)}</div>
            </Card>
          </>
        )}
        {!p && !miss && <p className="text-center text-sm text-muted">{t('उदाहरण: ', 'Example: ')}<button className="font-mono text-info underline" onClick={() => { setQ(CITIZEN_PROPERTY_ID); setFound(CITIZEN_PROPERTY_ID) }}>{CITIZEN_PROPERTY_ID}</button></p>}
      </main>

      {c && <Modal open={showNotice} onClose={() => setShowNotice(false)} title={t('मागणी नोटीस', 'Demand notice')} wide><NoticeLetter c={c} /></Modal>}
      {c && (
        <Modal open={objOpen} onClose={() => setObjOpen(false)} title={t('हरकत नोंदवा', 'File an objection')}>
          <form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); st.fileObjection(c.id, objText || t('क्षेत्रफळ जास्त दाखवले आहे. पुन्हा मोजणी करावी.', 'Area is overstated. Please re-measure.')); setObjOpen(false) }}>
            <Field label={t('हरकतीचे कारण', 'Reason')}>
              <textarea id="obj-text" rows={4} className={inputCls} value={objText} onChange={e => setObjText(e.target.value)} placeholder={t('उदा. क्षेत्रफळ जास्त दाखवले आहे.', 'e.g. Area is overstated.')} />
            </Field>
            <p className="text-xs text-muted">{t('सुनावणीची तारीख SMS / WhatsApp वर कळवली जाईल.', 'Hearing date will be sent by SMS / WhatsApp.')}</p>
            <Button type="submit">{t('हरकत पाठवा', 'Submit objection')}</Button>
          </form>
        </Modal>
      )}
    </div>
  )
}
