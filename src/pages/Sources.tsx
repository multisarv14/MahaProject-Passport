import { useState } from 'react'
import { Upload as UploadIcon } from 'lucide-react'
import { useStore } from '../store/store'
import { DATA_SOURCES, PERSONAS } from '../data/mock'
import { num, dmy } from '../lib/format'
import { Badge, Button, Card, Field, Modal, Notice, PageHeader, Table, inputCls } from '../components/ui'

const MAPPING: Record<string, [string, string][]> = {
  tax: [['Property_No', 'कर क्रमांक'], ['Owner_Name', 'मालक'], ['Usage_Type', 'वापर'], ['Assessed_Area', 'आकारलेले क्षेत्रफळ'], ['Address', 'पत्ता']],
  oc: [['OC_No', 'OC क्रमांक'], ['Issue_Date', 'दिनांक'], ['BuiltUp_Area', 'बांधीव क्षेत्रफळ'], ['Site_Address', 'पत्ता']],
  elec: [['Consumer_No', 'ग्राहक क्रमांक'], ['Tariff', 'दर प्रकार'], ['Conn_Date', 'जोडणी दिनांक'], ['Premise_Address', 'पत्ता']],
  igr: [['Doc_No', 'दस्त क्रमांक'], ['Reg_Date', 'दिनांक'], ['Buyer', 'खरेदीदार'], ['Property_Desc', 'पत्ता']],
  water: [['Conn_No', 'जोडणी क्रमांक'], ['Conn_Date', 'दिनांक'], ['Address', 'पत्ता']],
}

export default function Sources() {
  const st = useStore()
  const { t, lang, uploads } = st
  const [open, setOpen] = useState(false)
  const [src, setSrc] = useState<string>('elec')
  const [file, setFile] = useState('')
  const [progress, setProgress] = useState(0)

  const start = () => {
    setProgress(1)
    const iv = setInterval(() => setProgress(p => {
      if (p >= 100) { clearInterval(iv); return 100 }
      return p + 20
    }), 300)
  }
  const finish = () => {
    const s = DATA_SOURCES.find(d => d.id === src)!
    st.addUpload({ source: src, file: file || s.file, records: s.records })
    setOpen(false); setProgress(0); setFile('')
  }

  return (
    <>
      <PageHeader
        title={t('विभागांचा data', 'Department Data Sources')}
        sub={t('सुरुवातीला Excel / CSV द्वारे. पुढील टप्प्यात API. कोणत्याही विभागाला स्वतःची प्रणाली बदलावी लागत नाही.', 'Excel / CSV to begin with, APIs later. No department changes its own system.')}
        actions={<Button onClick={() => setOpen(true)}><UploadIcon size={16} />{t('नवीन data upload करा', 'Upload new data')}</Button>}
      />
      <Card>
        <Table head={[t('विभाग', 'Department'), t('शेवटची file', 'Latest file'), t('नोंदी', 'Records'), t('शेवटचे अद्ययावत', 'Last updated'), t('Data गुणवत्ता', 'Data quality'), t('पद्धत', 'Method')]}>
          {DATA_SOURCES.map(d => (
            <tr key={d.id}>
              <td className="font-semibold">{d.dept[lang]}</td>
              <td className="font-mono text-xs">{d.file}</td>
              <td className="tnum">{num(d.records)}</td>
              <td>{dmy(d.last)}</td>
              <td>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded bg-paper"><div className={'h-2 rounded ' + (d.quality >= 85 ? 'bg-ok' : 'bg-warn')} style={{ width: `${d.quality}%` }} /></div>
                  <span className="tnum">{d.quality}%</span>
                </div>
              </td>
              <td><Badge tone="neutral">Excel / CSV</Badge> <Badge tone="info">{t('API: पुढील टप्पा', 'API: next phase')}</Badge></td>
            </tr>
          ))}
        </Table>
        <p className="mt-3 text-xs text-muted">{t('Data गुणवत्ता = पत्ता, क्रमांक आणि दिनांक पूर्ण असलेल्या नोंदींचे प्रमाण.', 'Data quality = share of rows with complete address, reference number and date.')}</p>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t('Data गुणवत्तेतील अडचणी', 'Data quality issues')}>
          <ul className="flex flex-col gap-2 text-sm">
            <li><Badge tone="warn">IGR</Badge> {t('२१% नोंदींमध्ये पत्त्यात घर क्रमांक नाही', '21% of rows have no house number in the address')}</li>
            <li><Badge tone="warn">{t('पाणी', 'Water')}</Badge> {t('२८% नोंदींमध्ये प्रभाग नमूद नाही', '28% of rows have no ward')}</li>
            <li><Badge tone="info">MSEDCL</Badge> {t('पत्ते इंग्रजीत; मराठी नोंदींशी लिप्यंतरणाने जुळवणी', 'Addresses in English; matched to Marathi records by transliteration')}</li>
          </ul>
        </Card>
        <Card title={t('Upload इतिहास', 'Upload history')}>
          <Table head={[t('वेळ', 'Time'), t('विभाग', 'Source'), 'File', t('कोणी', 'By')]}>
            {uploads.slice(0, 8).map((u, i) => (
              <tr key={i}>
                <td className="tnum">{dmy(u.at)}</td>
                <td>{DATA_SOURCES.find(d => d.id === u.source)?.dept[lang]}</td>
                <td className="font-mono text-xs">{u.file}</td>
                <td>{PERSONAS.find(p => p.id === u.by)?.name ?? u.by}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setProgress(0) }} title={t('विभागाचा data upload', 'Upload department data')} wide>
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('विभाग', 'Department')}>
              <select id="up-src" className={inputCls} value={src} onChange={e => setSrc(e.target.value)}>
                {DATA_SOURCES.map(d => <option key={d.id} value={d.id}>{d.dept[lang]}</option>)}
              </select>
            </Field>
            <Field label="File (.xlsx / .csv)">
              <input id="up-file" className={inputCls} placeholder={DATA_SOURCES.find(d => d.id === src)?.file} value={file} onChange={e => setFile(e.target.value)} />
            </Field>
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold">{t('Columns जुळवणी', 'Column mapping')}</div>
            <Table head={[t('File मधील column', 'Column in file'), t('महा पासपोर्ट field', 'Maha Passport field'), '']}>
              {MAPPING[src].map(([a, b]) => <tr key={a}><td className="font-mono text-xs">{a}</td><td>{b}</td><td><Badge tone="ok">{t('आपोआप जुळले', 'Auto-matched')}</Badge></td></tr>)}
            </Table>
          </div>
          {progress > 0 && (
            <div>
              <div className="h-2 rounded bg-paper"><div className="h-2 rounded bg-ok transition-all" style={{ width: `${progress}%` }} /></div>
              <p className="mt-1 text-sm text-muted">{progress < 100 ? t('तपासणी सुरू: format, रिकाम्या नोंदी, duplicate…', 'Checking format, empty rows, duplicates…') : t('तपासणी पूर्ण. नोंदी जुळवणीसाठी तयार.', 'Checks complete. Records ready for matching.')}</p>
            </div>
          )}
          {progress >= 100 && <Notice tone="ok">{t('Upload यशस्वी. पुढील जुळवणीत हा data वापरला जाईल.', 'Upload complete. This data will be used in the next matching run.')}</Notice>}
          <div className="flex justify-end gap-2">
            {progress < 100 ? <Button onClick={start} disabled={progress > 0}>{t('Upload व तपासणी', 'Upload and check')}</Button> : <Button onClick={finish}>{t('पूर्ण', 'Done')}</Button>}
          </div>
        </div>
      </Modal>
    </>
  )
}
