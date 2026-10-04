import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Camera, ChevronLeft, ChevronRight, CloudOff, Crosshair, RefreshCw, Wifi } from 'lucide-react'
import { useStore } from '../store/store'
import { PERSONAS, PROPERTY_BY_ID, TODAY } from '../data/mock'
import { RULES, USAGE } from '../lib/labels'
import { num } from '../lib/format'
import { Card, PageHeader, Notice, cx } from '../components/ui'
import { MiniMap } from '../components/Evidence'
import { PhotoThumbs } from '../components/PhotoThumbs'
import type { Usage, Visit } from '../data/types'

export default function FieldApp() {
  const { id } = useParams()
  const st = useStore()
  const { t, lang, cases, persona } = st
  const nav = useNavigate()
  const inspectors = PERSONAS.filter(p => p.role === 'inspector')
  const [asInspector, setAsInspector] = useState(persona?.role === 'inspector' ? persona.id : inspectors[0].id)
  const [online, setOnline] = useState(true)
  const [queue, setQueue] = useState<{ id: string; visit: Visit }[]>([])
  const [toast, setToast] = useState('')

  const me = PERSONAS.find(p => p.id === asInspector)!
  const mine = cases.filter(c => c.assignedTo === me.id && c.status === 'assigned' && !queue.some(q => q.id === c.id))
  const current = id ? cases.find(c => c.id === id) : undefined

  const submit = (cid: string, visit: Visit) => {
    if (online) { st.submitVisit(cid, visit); setToast(t('पाहणी पाठवली', 'Visit submitted')) }
    else { setQueue(q => [...q, { id: cid, visit }]); setToast(t('Network नाही. पाहणी phone मध्ये जतन केली.', 'Offline. Visit saved on phone.')) }
    nav('/field')
    setTimeout(() => setToast(''), 2500)
  }
  const sync = () => { queue.forEach(q => st.submitVisit(q.id, q.visit)); setQueue([]); setToast(t('सर्व पाहण्या sync झाल्या', 'All visits synced')); setTimeout(() => setToast(''), 2500) }

  return (
    <>
      <PageHeader eyebrow={t('Mobile App', 'Mobile App')} title={t('प्रत्यक्ष पाहणी', 'Field Verification')} sub={t('निरीक्षक जागेवर जाऊन फोटो आणि GPS सह खात्री करतात. Network नसले तरी काम चालू राहते.', 'Inspectors confirm on site with photos and GPS. Works without network.')} />
      <div className="flex flex-wrap items-start gap-6">
        <div className="mx-auto w-[360px] max-w-full shrink-0 rounded-[2rem] border-[10px] border-ink bg-ink shadow-xl">
          <div className="relative flex h-[700px] flex-col overflow-hidden rounded-[1.4rem] bg-paper">
            <div className="flex items-center justify-between bg-ink px-4 pt-3 pb-2 text-xs text-white">
              <span>09:41</span>
              <span className="flex items-center gap-1">{online ? <Wifi size={13} /> : <CloudOff size={13} />}{online ? '4G' : t('Offline', 'Offline')}</span>
            </div>
            <div className="bg-ink px-4 pb-3 text-white">
              <div className="text-xs text-white/60">{t('महा पासपोर्ट · पाहणी', 'Maha Passport · Field')}</div>
              <div className="font-semibold">{me.name} · {me.office}</div>
            </div>

            {!current && (
              <div className="flex-1 overflow-y-auto p-3">
                <div className="mb-3 flex items-center justify-between rounded bg-white px-3 py-2 text-sm">
                  <span>{queue.length ? t(`${queue.length} पाहणी sync बाकी`, `${queue.length} visits to sync`) : t('सर्व sync झाले', 'All synced')}</span>
                  <button disabled={!online || !queue.length} onClick={sync} className="flex items-center gap-1 rounded px-2 py-1 text-info disabled:text-muted"><RefreshCw size={14} />Sync</button>
                </div>
                <div className="mb-2 text-xs font-semibold text-muted uppercase">{t(`आजची पाहणी यादी (${mine.length})`, `Today's visits (${mine.length})`)}</div>
                <div className="flex flex-col gap-2">
                  {mine.slice(0, 25).map(c => {
                    const p = PROPERTY_BY_ID[c.propertyId]
                    return (
                      <Link key={c.id} to={`/field/${c.id}`} className="flex items-center gap-2 rounded bg-white p-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{p.address}</div>
                          <div className="truncate text-xs text-muted">{c.rules.map(r => RULES[r].short[lang]).join(' · ')}</div>
                        </div>
                        <ChevronRight size={18} className="text-muted" />
                      </Link>
                    )
                  })}
                  {!mine.length && <p className="p-4 text-center text-sm text-muted">{t('आज कोणतीही पाहणी बाकी नाही.', 'No visits pending today.')}</p>}
                </div>
              </div>
            )}

            {current && <VisitForm key={current.id} caseId={current.id} by={me.id} onSubmit={submit} />}

            {toast && <div className="absolute inset-x-3 bottom-4 rounded bg-ink px-3 py-2 text-center text-sm text-white">{toast}</div>}
          </div>
        </div>

        <div className="flex min-w-[260px] flex-1 flex-col gap-4">
          <Card title={t('Demo नियंत्रण', 'Demo controls')}>
            <div className="flex flex-col gap-3 text-sm">
              {persona?.role !== 'inspector' && (
                <label className="flex flex-col gap-1">{t('निरीक्षक म्हणून पहा', 'View as inspector')}
                  <select id="field-as" className="rounded border border-line px-2 py-1.5" value={asInspector} onChange={e => { setAsInspector(e.target.value); nav('/field') }}>
                    {inspectors.map(i => <option key={i.id} value={i.id}>{i.name} · {i.office}</option>)}
                  </select>
                </label>
              )}
              <label className="flex items-center gap-2"><input id="field-online" type="checkbox" checked={online} onChange={e => setOnline(e.target.checked)} />{t('Network उपलब्ध', 'Network available')}</label>
              <p className="text-muted">{t('Network बंद करून पाहणी submit करा. ती phone मध्ये जतन होईल, आणि network आल्यावर Sync करता येईल.', 'Turn the network off and submit a visit. It is kept on the phone and can be synced when the network returns.')}</p>
            </div>
          </Card>
          <Notice tone="info">{t('पाहणी submit झाल्यावर प्रकरण "पाहणी पूर्ण" होते आणि कर निर्धारण अधिकाऱ्यांच्या मंजुरीसाठी जाते.', 'After submission the case becomes "Verified" and goes to the assessment officer for approval.')}</Notice>
        </div>
      </div>
    </>
  )
}

function VisitForm({ caseId, by, onSubmit }: { caseId: string; by: string; onSubmit: (id: string, v: Visit) => void }) {
  const { t, lang, cases } = useStore()
  const c = cases.find(x => x.id === caseId)!
  const p = PROPERTY_BY_ID[c.propertyId]
  const [gps, setGps] = useState('')
  const [photos, setPhotos] = useState(0)
  const [exists, setExists] = useState(true)
  const [usage, setUsage] = useState<Usage>(p.usage)
  const [area, setArea] = useState(p.area)
  const [remarks, setRemarks] = useState('')
  const ready = gps && photos >= 2
  const box = 'rounded border border-line bg-white px-3 py-2 text-[15px] w-full'

  return (
    <div className="flex-1 overflow-y-auto p-3 text-sm">
      <Link to="/field" className="mb-2 flex items-center gap-1 text-info"><ChevronLeft size={16} />{t('यादी', 'List')}</Link>
      <div className="rounded bg-white p-3">
        <div className="font-semibold">{p.address}</div>
        <div className="mt-0.5 font-mono text-[11px] text-muted">{p.id}</div>
        <div className="mt-2 text-xs text-warn">{c.rules.map(r => RULES[r][lang]).join(' · ')}</div>
        <div className="mt-2"><MiniMap p={p} height={110} /></div>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <button onClick={() => setGps(`${(19.0 + p.y / 1000).toFixed(5)}, ${(74.5 + p.x / 1000).toFixed(5)}`)} className={cx('flex items-center justify-center gap-2 rounded px-3 py-2.5 font-semibold', gps ? 'bg-ok-soft text-ok' : 'bg-ink text-white')}>
          <Crosshair size={16} />{gps ? `GPS: ${gps}` : t('GPS स्थान घ्या', 'Capture GPS')}
        </button>
        <div>
          <button onClick={() => setPhotos(n => Math.min(6, n + 1))} className="flex w-full items-center justify-center gap-2 rounded border border-ink px-3 py-2.5 font-semibold"><Camera size={16} />{t(`फोटो घ्या (${photos}/किमान २)`, `Take photo (${photos}/min 2)`)}</button>
          {photos > 0 && <div className="mt-2"><PhotoThumbs count={photos} seed={p.ward + p.area} /></div>}
        </div>
        <fieldset className="rounded bg-white p-3">
          <legend className="px-1 text-xs font-semibold text-muted">{t('बांधकाम आढळले?', 'Structure found?')}</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-1"><input type="radio" name="exists" checked={exists} onChange={() => setExists(true)} />{t('होय', 'Yes')}</label>
            <label className="flex items-center gap-1"><input type="radio" name="exists" checked={!exists} onChange={() => setExists(false)} />{t('नाही', 'No')}</label>
          </div>
        </fieldset>
        {exists && (
          <>
            <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-muted">{t('प्रत्यक्ष वापर', 'Actual usage')}</span>
              <select id="visit-usage" className={box} value={usage} onChange={e => setUsage(e.target.value as Usage)}>
                {(Object.keys(USAGE) as Usage[]).map(u => <option key={u} value={u}>{USAGE[u][lang]}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-muted">{t('मोजलेले क्षेत्रफळ (चौ.फूट)', 'Measured area (sq ft)')}</span>
              <input id="visit-area" type="number" className={box} value={area} onChange={e => setArea(+e.target.value)} />
              <span className="text-xs text-muted">{t('नोंदीत', 'On record')}: {num(p.tax?.assessedArea ?? p.oc?.builtUpArea ?? p.area)}</span>
            </label>
          </>
        )}
        <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-muted">{t('शेरा', 'Remarks')}</span>
          <textarea id="visit-remarks" className={box} rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} />
        </label>
        <button disabled={!ready} onClick={() => onSubmit(c.id, {
          date: TODAY, by, exists, usageFound: usage, measuredArea: exists ? area : 0, photos, gps,
          remarks: remarks || (exists ? t('बांधकाम आढळले, वापर सुरू आहे.', 'Structure found and in use.') : t('जागेवर बांधकाम आढळले नाही.', 'No structure found on site.')),
        })} className="rounded bg-ok px-3 py-3 font-semibold text-white disabled:opacity-40">
          {ready ? t('पाहणी submit करा', 'Submit visit') : t('GPS आणि किमान २ फोटो आवश्यक', 'GPS and at least 2 photos required')}
        </button>
      </div>
    </div>
  )
}
