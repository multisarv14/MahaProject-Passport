import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, PenLine, Upload as UploadIcon } from 'lucide-react'
import { useStore } from '../store/store'
import { DATA_SOURCES } from '../data/mock'
import { num, dmy } from '../lib/format'
import { api, apiUpload } from '../api/client'
import { useApi } from '../api/useApi'
import { Badge, Button, Card, Field, LoadError, Modal, Notice, PageHeader, Table, inputCls } from '../components/ui'

type Source = 'tax' | 'oc' | 'elec' | 'igr' | 'water'
interface Staged { id: number; source: Source; fileName: string; headers: string[]; mapping: Record<string, string | null>; total: number; sample: Record<string, string>[]; fields: { key: string; label: string; required: boolean }[] }
interface Check { ok: number; rejected: number; missingFields: string[]; errors: { row_no: number; errors: string[] }[] }
interface Committed { inserted: number; updated: number; rejected: number; quality: number; errors: { row_no: number; errors: string[] }[] }
interface FieldDef { key: string; label: string; required: boolean; kind: 'text' | 'int' | 'date' | 'usage' | 'tariff' | 'bool' }
interface RecentRow { id: number; source: Source; ref_no: string; address: string; name: string | null; channel: 'form' | 'api'; match_status: string; updated_at: string; entered_by: string | null }

interface UploadRow { id: number; source: Source; file_name: string; status: string; rows_total: number | null; rows_ok: number | null; rows_rejected: number | null; quality_pct: number | null; uploaded_at: string; uploaded_by: string | null }

const deptName = (s: string, lang: 'mr' | 'en') => DATA_SOURCES.find(d => d.id === s)?.dept[lang] ?? s

export default function Sources() {
  const { t, lang, persona } = useStore()
  const history = useApi<UploadRow[]>('/uploads')
  const restricted = persona?.role === 'dept_data_officer'
  const recent = useApi<RecentRow[]>('/records/recent')
  const [formOpen, setFormOpen] = useState(false)
  const [open, setOpen] = useState(false)
  const [src, setSrc] = useState<Source>('elec')
  const [file, setFile] = useState<File | null>(null)
  const [staged, setStaged] = useState<Staged | null>(null)
  const [mapping, setMapping] = useState<Record<string, string | null>>({})
  const [check, setCheck] = useState<Check | null>(null)
  const [done, setDone] = useState<Committed | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const reset = () => { setStaged(null); setCheck(null); setDone(null); setFile(null); setErr('') }
  const close = async () => {
    if (staged && !done) await api(`/uploads/${staged.id}/discard`, { method: 'POST', body: {} }).catch(() => {})
    reset(); setOpen(false); history.reload()
  }
  const guard = async (f: () => Promise<void>) => { setBusy(true); setErr(''); try { await f() } catch (e) { setErr((e as Error).message) } finally { setBusy(false) } }

  const send = () => guard(async () => {
    const fd = new FormData(); fd.append('source', src); fd.append('file', file!)
    const s = await apiUpload<Staged>('/uploads', fd)
    setStaged(s); setMapping(s.mapping); setCheck(null)
  })
  const validate = () => guard(async () => setCheck(await api<Check>(`/uploads/${staged!.id}/validate`, { method: 'POST', body: { mapping } })))
  const commit = () => guard(async () => { setDone(await api<Committed>(`/uploads/${staged!.id}/commit`, { method: 'POST', body: { mapping } })); history.reload() })

  return (
    <>
      <PageHeader
        title={t('विभागांचा data', 'Department Data Sources')}
        sub={t('विभागांकडून Excel / CSV file. कोणत्याही विभागाला स्वतःची प्रणाली बदलावी लागत नाही.', 'Excel / CSV files from departments. No department changes its own system.')}
        actions={<>
          <Button variant="secondary" onClick={() => setFormOpen(true)}><PenLine size={16} />{t('हाताने नोंद भरा', 'Enter a record')}</Button>
          <Button onClick={() => { reset(); setOpen(true) }}><UploadIcon size={16} />{t('नवीन file upload करा', 'Upload a file')}</Button>
        </>}
      />

      <Card title={t('विभागनिहाय नमुना file (format)', 'Template file per department')}>
        <p className="mb-3 text-sm text-muted">{t('विभागांना हे format पाठवा. Column ची नावे मराठी किंवा English असली तरी चालतात.', 'Send these formats to departments. Column names may be in Marathi or English.')}</p>
        <div className="flex flex-wrap gap-2">
          {DATA_SOURCES.map(d => (
            <a key={d.id} href={`/templates/${d.id}.csv`} download className="inline-flex items-center gap-1.5 rounded border border-line bg-white px-3 py-1.5 text-sm hover:bg-paper"><Download size={14} />{d.dept[lang]}</a>
          ))}
        </div>
      </Card>

      <Card className="mt-4" title={t('Upload इतिहास', 'Upload history')}>
        {history.error && <LoadError message={history.error} onRetry={history.reload} />}
        {history.data && (
          <Table head={[t('वेळ', 'Time'), t('विभाग', 'Department'), 'File', t('ओळी', 'Rows'), t('स्वीकारल्या', 'Accepted'), t('नाकारल्या', 'Rejected'), t('गुणवत्ता', 'Quality'), t('कोणी', 'By'), t('स्थिती', 'Status')]} empty={!history.data.length}>
            {history.data.map(u => (
              <tr key={u.id}>
                <td className="tnum whitespace-nowrap">{dmy(u.uploaded_at)}</td>
                <td>{deptName(u.source, lang)}</td>
                <td className="font-mono text-xs">{u.file_name}</td>
                <td className="tnum">{u.rows_total ?? '—'}</td>
                <td className="tnum">{u.rows_ok ?? '—'}</td>
                <td className="tnum">{u.rows_rejected ?? '—'}</td>
                <td className="tnum">{u.quality_pct != null ? `${u.quality_pct}%` : '—'}</td>
                <td>{u.uploaded_by ?? '—'}</td>
                <td>{u.status === 'committed' ? <Badge tone="ok">{t('जतन', 'Saved')}</Badge> : <Badge tone="warn">{t('अपूर्ण', 'Not finished')}</Badge>}</td>
              </tr>
            ))}
          </Table>
        )}
        {history.data && !history.data.length && <p className="text-center text-xs text-muted">{t('Demo data थेट database मध्ये भरला आहे. नवीन file चढवल्यावर ती येथे दिसेल.', 'Demo data was loaded directly. New uploads appear here.')}</p>}
      </Card>

      <Card className="mt-4" title={t('अलीकडील नोंदी: form व API', 'Recent records: form and API')}>
        {recent.error && <LoadError message={recent.error} onRetry={recent.reload} />}
        {recent.data && (
          <Table head={[t('वेळ', 'Time'), t('विभाग', 'Department'), t('क्रमांक', 'Reference'), t('पत्ता', 'Address'), t('कसे आले', 'Channel'), t('कोणी', 'By'), t('जुळवणी', 'Matching')]} empty={!recent.data.length}>
            {recent.data.map(r => (
              <tr key={r.id}>
                <td className="tnum whitespace-nowrap">{dmy(r.updated_at)}</td>
                <td>{deptName(r.source, lang)}</td>
                <td className="font-mono text-xs">{r.ref_no}</td>
                <td className="max-w-xs">{r.address}<div className="text-xs text-muted">{r.name}</div></td>
                <td>{r.channel === 'api' ? <Badge tone="info">API</Badge> : <Badge tone="file">{t('Form', 'Form')}</Badge>}</td>
                <td>{r.entered_by ?? '—'}</td>
                <td>{r.match_status === 'pending' ? <Badge tone="warn">{t('बाकी', 'Pending')}</Badge> : r.match_status === 'review' ? <Badge tone="bad">{t('पडताळणी', 'Review')}</Badge> : <Badge tone="ok">{r.match_status === 'new' ? t('नवीन Passport', 'New passport') : t('जोडली', 'Linked')}</Badge>}</td>
              </tr>
            ))}
          </Table>
        )}
        {recent.data && !recent.data.length && <p className="text-center text-xs text-muted">{t('हाताने भरलेल्या किंवा API ने आलेल्या नोंदी येथे दिसतील.', 'Records typed in or received through the API appear here.')}</p>}
      </Card>

      {formOpen && <RecordForm restricted={restricted} onClose={() => setFormOpen(false)} onSaved={() => { recent.reload(); history.reload() }} />}

      <Modal open={open} onClose={close} title={t('विभागाचा data upload', 'Upload department data')} wide>
        <div className="flex flex-col gap-4">
          {err && <Notice tone="bad">{err}</Notice>}

          {!staged && (
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); send() }}>
              <Field label={t('विभाग', 'Department')}>
                <select id="up-src" className={inputCls} value={src} onChange={e => setSrc(e.target.value as Source)}>
                  {DATA_SOURCES.map(d => <option key={d.id} value={d.id}>{d.dept[lang]}</option>)}
                </select>
              </Field>
              <Field label="File (.xlsx / .csv)">
                <input id="up-file" type="file" accept=".csv,.xlsx" className={inputCls} onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </Field>
              {restricted && <p className="text-xs text-muted sm:col-span-2">{t('आपण फक्त आपल्या विभागाची file चढवू शकता.', 'You can upload only your own department\'s files.')}</p>}
              <div className="sm:col-span-2"><Button type="submit" disabled={!file || busy}>{busy ? t('वाचत आहे…', 'Reading…') : t('File वाचा', 'Read file')}</Button></div>
            </form>
          )}

          {staged && !done && (
            <>
              <p className="text-sm"><b className="font-mono">{staged.fileName}</b> · {deptName(staged.source, lang)} · {num(staged.total)} {t('ओळी', 'rows')}</p>
              <div>
                <div className="mb-2 text-sm font-semibold">{t('Columns जुळवणी', 'Column mapping')}</div>
                <Table head={[t('महा पासपोर्ट field', 'Maha Passport field'), t('File मधील column', 'Column in file'), t('नमुना', 'Example')]}>
                  {staged.fields.map(f => (
                    <tr key={f.key}>
                      <td>{f.label}{f.required && <span className="text-bad"> *</span>}</td>
                      <td>
                        <select id={`map-${f.key}`} className="rounded border border-line px-2 py-1 text-sm" value={mapping[f.key] ?? ''} onChange={e => { setMapping(m => ({ ...m, [f.key]: e.target.value || null })); setCheck(null) }}>
                          <option value="">{t('— नाही —', '— none —')}</option>
                          {staged.headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </td>
                      <td className="max-w-xs truncate text-muted">{mapping[f.key] ? staged.sample[0]?.[mapping[f.key]!] : ''}</td>
                    </tr>
                  ))}
                </Table>
              </div>

              {check && (
                <div className="flex flex-col gap-2">
                  {check.missingFields.length > 0 && <Notice tone="bad">{t('अनिवार्य columns जुळवा: ', 'Map the required columns: ')}{check.missingFields.join(', ')}</Notice>}
                  <Notice tone={check.rejected ? 'warn' : 'ok'}>{t(`${check.ok} ओळी स्वीकारल्या जातील, ${check.rejected} नाकारल्या जातील.`, `${check.ok} rows will be accepted, ${check.rejected} rejected.`)}</Notice>
                  {check.errors.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded border border-line">
                      <Table head={[t('ओळ', 'Row'), t('कारण', 'Reason')]}>
                        {check.errors.map(e => <tr key={e.row_no}><td className="tnum">{e.row_no}</td><td>{e.errors.join('; ')}</td></tr>)}
                      </Table>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" onClick={close}>{t('रद्द करा', 'Cancel')}</Button>
                <Button variant="secondary" disabled={busy} onClick={validate}>{t('तपासा', 'Check rows')}</Button>
                <Button disabled={busy || !check || check.missingFields.length > 0 || check.ok === 0} onClick={commit}>{t('स्वीकारलेल्या ओळी जतन करा', 'Save accepted rows')}</Button>
              </div>
            </>
          )}

          {done && (
            <div className="flex flex-col gap-3">
              <Notice tone="ok">{t(`जतन झाले: ${done.inserted} नवीन, ${done.updated} अद्ययावत, ${done.rejected} नाकारल्या. गुणवत्ता ${done.quality}%.`, `Saved: ${done.inserted} new, ${done.updated} updated, ${done.rejected} rejected. Quality ${done.quality}%.`)}</Notice>
              <p className="text-sm text-muted">{t('या नोंदी पुढील जुळवणीत मालमत्तांशी जोडल्या जातील.', 'These records will be linked to properties in the next matching run.')}</p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={close}>{t('बंद करा', 'Close')}</Button>
                {!restricted && <Link to="/matching" onClick={() => { reset(); setOpen(false) }}><Button>{t('जुळवणी चालवा', 'Run matching')}</Button></Link>}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}

function RecordForm({ restricted, onClose, onSaved }: { restricted: boolean; onClose: () => void; onSaved: () => void }) {
  const { t, lang } = useStore()
  const [src, setSrc] = useState<Source>('elec')
  const fields = useApi<FieldDef[]>(`/fields/${src}`)
  const [vals, setVals] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const set = (k: string, v: string) => setVals(x => ({ ...x, [k]: v }))

  const submit = async () => {
    setBusy(true); setErr(''); setOk('')
    try {
      const r = await api<{ ref: string; inserted: boolean }>('/records', { method: 'POST', body: { source: src, data: vals } })
      setOk(r.inserted ? t(`नोंद ${r.ref} जतन झाली. ती पुढील जुळवणीत मालमत्तेशी जोडली जाईल.`, `Record ${r.ref} saved. It will be matched in the next run.`) : t(`नोंद ${r.ref} अद्ययावत झाली.`, `Record ${r.ref} updated.`))
      setVals({}); onSaved()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const input = (f: FieldDef) => {
    const common = { id: `rec-${f.key}`, className: inputCls, value: vals[f.key] ?? '', required: f.required }
    if (f.kind === 'usage') return (
      <select {...common} onChange={e => set(f.key, e.target.value)}>
        <option value="">—</option><option value="residential">{t('निवासी', 'Residential')}</option><option value="commercial">{t('व्यावसायिक', 'Commercial')}</option><option value="mixed">{t('मिश्र', 'Mixed')}</option>
      </select>)
    if (f.kind === 'tariff') return (
      <select {...common} onChange={e => set(f.key, e.target.value)}>
        <option value="">—</option><option value="LT-I Residential">LT-I {t('निवासी', 'Residential')}</option><option value="LT-II Commercial">LT-II {t('व्यावसायिक', 'Commercial')}</option>
      </select>)
    return <input {...common} type={f.kind === 'date' ? 'date' : f.kind === 'int' ? 'number' : 'text'} min={f.kind === 'int' ? 0 : undefined} onChange={e => set(f.key, e.target.value)} />
  }

  return (
    <Modal open onClose={onClose} title={t('हाताने नोंद भरा', 'Enter a record')} wide>
      <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); submit() }}>
        {err && <Notice tone="bad">{err}</Notice>}
        {ok && <Notice tone="ok">{ok}</Notice>}
        <Field label={t('विभाग', 'Department')}>
          <select id="rec-src" className={inputCls} value={src} onChange={e => { setSrc(e.target.value as Source); setVals({}); setOk('') }}>
            {DATA_SOURCES.map(d => <option key={d.id} value={d.id}>{d.dept[lang]}</option>)}
          </select>
        </Field>
        {restricted && <p className="-mt-2 text-xs text-muted">{t('आपण फक्त आपल्या विभागाच्या नोंदी भरू शकता; इतर विभाग निवडल्यास जतन होणार नाही.', 'You can enter only your own department\'s records.')}</p>}
        {fields.error && <LoadError message={fields.error} onRetry={fields.reload} />}
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.data?.map(f => <Field key={f.key} label={f.label + (f.required ? ' *' : '')}>{input(f)}</Field>)}
        </div>
        <p className="text-xs text-muted">{t('* अनिवार्य. आधीच असलेला क्रमांक भरल्यास ती नोंद अद्ययावत होते.', '* required. Entering an existing reference number updates that record.')}</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('बंद करा', 'Close')}</Button>
          <Button type="submit" disabled={busy || !fields.data}>{t('नोंद जतन करा', 'Save record')}</Button>
        </div>
      </form>
    </Modal>
  )
}
