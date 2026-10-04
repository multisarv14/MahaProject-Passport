import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Upload as UploadIcon } from 'lucide-react'
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
interface UploadRow { id: number; source: Source; file_name: string; status: string; rows_total: number | null; rows_ok: number | null; rows_rejected: number | null; quality_pct: number | null; uploaded_at: string; uploaded_by: string | null }

const deptName = (s: string, lang: 'mr' | 'en') => DATA_SOURCES.find(d => d.id === s)?.dept[lang] ?? s

export default function Sources() {
  const { t, lang, persona } = useStore()
  const history = useApi<UploadRow[]>('/uploads')
  const restricted = persona?.role === 'dept_data_officer'
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
        actions={<Button onClick={() => { reset(); setOpen(true) }}><UploadIcon size={16} />{t('नवीन file upload करा', 'Upload a file')}</Button>}
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
