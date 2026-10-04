import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Camera, ChevronLeft, ChevronRight, CloudOff, Crosshair, RefreshCw, Wifi } from 'lucide-react'
import { useStore } from '../store/store'
import { RULES, USAGE } from '../lib/labels'
import { num } from '../lib/format'
import { api } from '../api/client'
import { useApi } from '../api/useApi'
import { toProperty } from '../api/adapters'
import type { ApiCase, ApiCaseRow } from '../api/types'
import { Card, LoadError, Notice, PageHeader, cx } from '../components/ui'
import { MiniMap } from '../components/Evidence'
import { PhotoThumbs } from '../components/PhotoThumbs'
import type { Usage } from '../data/types'

interface VisitBody { structureFound: boolean; usageFound: Usage; measuredArea: number; photos: number; lat: number; lng: number; remarks: string }

const QUEUE_KEY = 'maha-passport-field-queue'
const loadQueue = (): { id: string; body: VisitBody }[] => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') } catch { return [] } }
const saveQueue = (q: { id: string; body: VisitBody }[]) => { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)) } catch { /* ignore */ } }

export default function FieldApp() {
  const { id } = useParams()
  const { t, lang, persona } = useStore()
  const nav = useNavigate()
  const isInspector = persona?.role === 'inspector'
  const list = useApi<ApiCaseRow[]>(isInspector ? '/cases?status=assigned&limit=100' : null)
  const [online, setOnline] = useState(true)
  const [queue, setQueue] = useState(loadQueue)
  const [toast, setToast] = useState('')
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2800) }

  const mine = (list.data ?? []).filter(c => !queue.some(q => q.id === c.id))

  const submit = async (cid: string, body: VisitBody) => {
    if (!online) {
      const q = [...queue, { id: cid, body }]; setQueue(q); saveQueue(q)
      flash(t('Network नाही. पाहणी phone मध्ये जतन केली.', 'Offline. Visit saved on phone.')); nav('/field'); return
    }
    try {
      await api(`/cases/${cid}/visit`, { method: 'POST', body })
      flash(t('पाहणी पाठवली', 'Visit submitted')); nav('/field'); list.reload()
    } catch (e) { flash((e as Error).message) }
  }
  const sync = async () => {
    const left: typeof queue = []
    for (const q of queue) {
      try { await api(`/cases/${q.id}/visit`, { method: 'POST', body: q.body }) } catch { left.push(q) }
    }
    setQueue(left); saveQueue(left); list.reload()
    flash(left.length ? t(`${left.length} पाहणी sync झाल्या नाहीत`, `${left.length} visits failed to sync`) : t('सर्व पाहण्या sync झाल्या', 'All visits synced'))
  }

  return (
    <>
      <PageHeader eyebrow="Mobile App" title={t('प्रत्यक्ष पाहणी', 'Field Verification')} sub={t('निरीक्षक जागेवर जाऊन फोटो आणि GPS सह खात्री करतात. Network नसले तरी काम चालू राहते.', 'Inspectors confirm on site with photos and GPS. Works without network.')} />
      {!isInspector && <div className="mb-4"><Notice tone="info">{t('हे दृश्य कर निरीक्षकांसाठी आहे. Demo मध्ये वरून "कर निरीक्षक" भूमिका निवडा.', 'This view is for field inspectors. In the demo, switch to an inspector role at the top.')}</Notice></div>}
      <div className="flex flex-wrap items-start gap-6">
        <div className="mx-auto w-[360px] max-w-full shrink-0 rounded-[2rem] border-[10px] border-ink bg-ink shadow-xl">
          <div className="relative flex h-[700px] flex-col overflow-hidden rounded-[1.4rem] bg-paper">
            <div className="flex items-center justify-between bg-ink px-4 pt-3 pb-2 text-xs text-white">
              <span>09:41</span>
              <span className="flex items-center gap-1">{online ? <Wifi size={13} /> : <CloudOff size={13} />}{online ? '4G' : 'Offline'}</span>
            </div>
            <div className="bg-ink px-4 pb-3 text-white">
              <div className="text-xs text-white/60">{t('महा पासपोर्ट · पाहणी', 'Maha Passport · Field')}</div>
              <div className="font-semibold">{persona?.name}</div>
            </div>

            {!id && (
              <div className="flex-1 overflow-y-auto p-3">
                <div className="mb-3 flex items-center justify-between rounded bg-white px-3 py-2 text-sm">
                  <span>{queue.length ? t(`${queue.length} पाहणी sync बाकी`, `${queue.length} visits to sync`) : t('सर्व sync झाले', 'All synced')}</span>
                  <button disabled={!online || !queue.length} onClick={sync} className="flex items-center gap-1 rounded px-2 py-1 text-info disabled:text-muted"><RefreshCw size={14} />Sync</button>
                </div>
                {list.error && <LoadError message={list.error} onRetry={list.reload} />}
                <div className="mb-2 text-xs font-semibold text-muted uppercase">{t(`पाहणी यादी (${mine.length})`, `Visits (${mine.length})`)}</div>
                <div className="flex flex-col gap-2">
                  {mine.map(c => (
                    <Link key={c.id} to={`/field/${c.id}`} className="flex items-center gap-2 rounded bg-white p-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{c.address}</div>
                        <div className="truncate text-xs text-muted">{c.rules.map(r => RULES[r].short[lang]).join(' · ')}</div>
                      </div>
                      <ChevronRight size={18} className="text-muted" />
                    </Link>
                  ))}
                  {list.data && !mine.length && <p className="p-4 text-center text-sm text-muted">{t('कोणतीही पाहणी बाकी नाही.', 'No visits pending.')}</p>}
                </div>
              </div>
            )}

            {id && isInspector && <VisitForm key={id} caseId={id} onSubmit={submit} />}
            {toast && <div className="absolute inset-x-3 bottom-4 rounded bg-ink px-3 py-2 text-center text-sm text-white">{toast}</div>}
          </div>
        </div>

        <div className="flex min-w-[260px] flex-1 flex-col gap-4">
          <Card title={t('Demo नियंत्रण', 'Demo controls')}>
            <div className="flex flex-col gap-3 text-sm">
              <label className="flex items-center gap-2"><input id="field-online" type="checkbox" checked={online} onChange={e => setOnline(e.target.checked)} />{t('Network उपलब्ध', 'Network available')}</label>
              <p className="text-muted">{t('Network बंद करून पाहणी submit करा. ती phone मध्ये जतन होईल आणि network आल्यावर Sync करता येईल.', 'Turn the network off and submit a visit. It is kept on the phone and can be synced when the network returns.')}</p>
            </div>
          </Card>
          <Notice tone="info">{t('पाहणी submit झाल्यावर प्रकरण "पाहणी पूर्ण" होते आणि कर निर्धारण अधिकाऱ्यांच्या मंजुरीसाठी जाते.', 'After submission the case becomes "Verified" and goes to the assessment officer for approval.')}</Notice>
        </div>
      </div>
    </>
  )
}

function VisitForm({ caseId, onSubmit }: { caseId: string; onSubmit: (id: string, v: VisitBody) => void }) {
  const { t, lang } = useStore()
  const res = useApi<ApiCase>(`/cases/${caseId}`)
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null)
  const [photos, setPhotos] = useState(0)
  const [exists, setExists] = useState(true)
  const [usage, setUsage] = useState<Usage | ''>('')
  const [area, setArea] = useState<number | ''>('')
  const [remarks, setRemarks] = useState('')
  if (res.error) return <div className="p-3"><LoadError message={res.error} /></div>
  if (!res.data) return <p className="p-4 text-center text-sm text-muted">{t('माहिती आणत आहे…', 'Loading…')}</p>
  const p = toProperty(res.data.property, res.data.records)
  const ready = gps && photos >= 2
  const box = 'rounded border border-line bg-white px-3 py-2 text-[15px] w-full'
  const capture = () => {
    // Demo devices have no real fix; fall back to the property's recorded point.
    const fallback = { lat: res.data!.property.lat ?? 19.02, lng: res.data!.property.lng ?? 74.52 }
    if (!navigator.geolocation) return setGps(fallback)
    navigator.geolocation.getCurrentPosition(pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }), () => setGps(fallback), { timeout: 4000 })
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 text-sm">
      <Link to="/field" className="mb-2 flex items-center gap-1 text-info"><ChevronLeft size={16} />{t('यादी', 'List')}</Link>
      <div className="rounded bg-white p-3">
        <div className="font-semibold">{p.address}</div>
        <div className="mt-0.5 font-mono text-[11px] text-muted">{p.id}</div>
        <div className="mt-2 text-xs text-warn">{res.data.rules.map(r => RULES[r][lang]).join(' · ')}</div>
        <div className="mt-2"><MiniMap p={p} height={110} /></div>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <button onClick={capture} className={cx('flex items-center justify-center gap-2 rounded px-3 py-2.5 font-semibold', gps ? 'bg-ok-soft text-ok' : 'bg-ink text-white')}>
          <Crosshair size={16} />{gps ? `GPS: ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : t('GPS स्थान घ्या', 'Capture GPS')}
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
              <select id="visit-usage" className={box} value={usage || p.usage} onChange={e => setUsage(e.target.value as Usage)}>
                {(Object.keys(USAGE) as Usage[]).map(u => <option key={u} value={u}>{USAGE[u][lang]}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-muted">{t('मोजलेले क्षेत्रफळ (चौ.फूट)', 'Measured area (sq ft)')}</span>
              <input id="visit-area" type="number" min={0} className={box} value={area === '' ? p.area : area} onChange={e => setArea(e.target.value === '' ? '' : +e.target.value)} />
              <span className="text-xs text-muted">{t('नोंदीत', 'On record')}: {num(p.tax?.assessedArea ?? p.oc?.builtUpArea ?? p.area)}</span>
            </label>
          </>
        )}
        <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-muted">{t('शेरा', 'Remarks')}</span>
          <textarea id="visit-remarks" className={box} rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} />
        </label>
        <button disabled={!ready} onClick={() => gps && onSubmit(caseId, {
          structureFound: exists, usageFound: usage || p.usage, measuredArea: exists ? (area === '' ? p.area : area) : 0, photos, lat: gps.lat, lng: gps.lng,
          remarks: remarks || (exists ? t('बांधकाम आढळले, वापर सुरू आहे.', 'Structure found and in use.') : t('जागेवर बांधकाम आढळले नाही.', 'No structure found on site.')),
        })} className="rounded bg-ok px-3 py-3 font-semibold text-white disabled:opacity-40">
          {ready ? t('पाहणी submit करा', 'Submit visit') : t('GPS आणि किमान २ फोटो आवश्यक', 'GPS and at least 2 photos required')}
        </button>
      </div>
    </div>
  )
}
