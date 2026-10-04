import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, FileText, MapPin } from 'lucide-react'
import { useStore } from '../store/store'
import { PERSONAS, PROPERTY_BY_ID, WARD_NAMES, inspectorForWard } from '../data/mock'
import { RULES, USAGE } from '../lib/labels'
import { inr, num, dmy } from '../lib/format'
import { Button, Card, Field, KV, Modal, Notice, PageHeader, StatusBadge, inputCls } from '../components/ui'
import { MiniMap, SourceComparison } from '../components/Evidence'
import { NoticeLetter } from '../components/NoticeLetter'
import { PhotoThumbs } from '../components/PhotoThumbs'

export default function CaseDetail() {
  const { id = '' } = useParams()
  const st = useStore()
  const { t, lang, cases, persona, audit } = st
  const c = cases.find(x => x.id === id)
  const [showNotice, setShowNotice] = useState(false)
  const [inspector, setInspector] = useState('')
  const [demand, setDemand] = useState<number | ''>('')
  const [note, setNote] = useState('')
  const [revised, setRevised] = useState<number | ''>('')
  if (!c || !persona) return <Notice tone="bad">{t('प्रकरण सापडले नाही.', 'Case not found.')} <Link className="underline" to="/cases">{t('यादीकडे परत', 'Back to list')}</Link></Notice>
  const p = PROPERTY_BY_ID[c.propertyId]
  const role = persona.role
  const nameOf = (uid?: string) => PERSONAS.find(x => x.id === uid)?.name ?? '—'
  const can = (...r: string[]) => r.includes(role) || role === 'platform_admin'
  const inspectors = PERSONAS.filter(x => x.role === 'inspector')
  const suggested = inspectorForWard(p.ward)

  return (
    <>
      <PageHeader
        eyebrow={t('संशयित प्रकरण', 'Case')}
        title={`${c.id} · ${p.address}`}
        sub={<span className="flex flex-wrap items-center gap-2"><StatusBadge status={c.status} /> {t('विश्वास', 'Confidence')} {c.confidence}% · {t('उघडले', 'Opened')} {dmy(c.openedOn)} · <Link to={`/property/${p.id}`} className="font-mono text-info underline">{p.id}</Link></span>}
        actions={c.noticeNo && <Button variant="secondary" onClick={() => setShowNotice(true)}><FileText size={16} />{t('नोटीस पहा', 'View notice')}</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <Card title={t('हे प्रकरण का उघडले', 'Why this case was opened')}>
            <div className="flex flex-col gap-2">
              {c.rules.map(r => <Notice key={r} tone="warn"><b className="mr-2 font-mono">{r}</b>{RULES[r][lang]}</Notice>)}
            </div>
            <p className="mt-3 text-xs text-muted">{t('प्रणाली फक्त संशय दाखवते. निर्णय पाहणी आणि अधिकाऱ्याच्या मंजुरीनंतरच होतो.', 'The system only flags. Decisions follow a site visit and officer approval.')}</p>
          </Card>

          <Card title={t('पुरावा: विभागांच्या नोंदी', 'Evidence: department records')}>
            <SourceComparison p={p} />
          </Card>

          <Card title={t('प्रत्यक्ष पाहणी', 'Site verification')}>
            {c.visit ? (
              <>
                <KV items={[
                  [t('दिनांक', 'Date'), dmy(c.visit.date)], [t('निरीक्षक', 'Inspector'), nameOf(c.visit.by)],
                  [t('बांधकाम आढळले', 'Structure found'), c.visit.exists ? t('होय', 'Yes') : t('नाही', 'No')],
                  [t('आढळलेला वापर', 'Usage found'), USAGE[c.visit.usageFound][lang]],
                  [t('मोजलेले क्षेत्रफळ', 'Measured area'), `${num(c.visit.measuredArea)} ${t('चौ.फूट', 'sq ft')}`],
                  ['GPS', <span className="flex items-center gap-1 font-mono text-xs"><MapPin size={13} />{c.visit.gps}</span>],
                ]} />
                <p className="mt-3 text-sm"><b>{t('शेरा', 'Remarks')}:</b> {c.visit.remarks}</p>
                <div className="mt-3"><PhotoThumbs count={c.visit.photos} seed={p.ward + p.area} /></div>
              </>
            ) : <p className="text-sm text-muted">{t('पाहणी अजून झालेली नाही.', 'Not visited yet.')}</p>}
          </Card>

          {c.objection && (
            <Card title={t('हरकत', 'Objection')}>
              <KV items={[[t('दिनांक', 'Date'), dmy(c.objection.date)], [t('निर्णय', 'Decision'), c.objection.decision ? (c.objection.decision === 'upheld' ? t('मान्य', 'Upheld') : t('फेटाळली', 'Rejected')) : t('प्रलंबित', 'Pending')]]} />
              <p className="mt-3 rounded bg-paper p-3 text-sm">“{c.objection.text}”</p>
              {c.objection.decisionNote && <p className="mt-2 text-sm"><b>{t('सुनावणी शेरा', 'Hearing note')}:</b> {c.objection.decisionNote}</p>}
            </Card>
          )}

          <Card title={t('कामकाजाची नोंद', 'Activity')}>
            <ol className="relative ml-2 border-l-2 border-line pl-5 text-sm">
              <li className="mb-3"><div className="font-semibold">{t('जुळवणीत संशय नोंदला', 'Flagged by matching')}</div><div className="text-muted">{dmy(c.openedOn)} · {t('प्रणाली', 'System')}</div></li>
              {audit.filter(a => a.entity === c.id).reverse().map((a, i) => (
                <li key={i} className="mb-3"><div className="font-semibold">{a.action}</div><div className="text-muted">{dmy(a.at)} · {nameOf(a.who)}</div></li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title={t('पुढील कृती', 'Next action')}>
            {c.status === 'suspected' && (can('ward_officer', 'assessment_officer', 'commissioner') ? (
              <div className="flex flex-col gap-3">
                <Field label={t('पाहणीसाठी निरीक्षक', 'Assign inspector')}>
                  <select id="assign-insp" className={inputCls} value={inspector || suggested.id} onChange={e => setInspector(e.target.value)}>
                    {inspectors.map(i => <option key={i.id} value={i.id}>{i.name} · {i.office}{i.id === suggested.id ? ` (${t('सुचवलेले', 'suggested')})` : ''}</option>)}
                  </select>
                </Field>
                <Button onClick={() => st.assign(c.id, inspector || suggested.id)}>{t('पाहणीसाठी सोपवा', 'Assign for visit')}</Button>
              </div>
            ) : <p className="text-sm text-muted">{t('प्रभाग अधिकारी निरीक्षकाकडे सोपवतील.', 'Ward officer will assign an inspector.')}</p>)}

            {c.status === 'assigned' && (
              <div className="flex flex-col gap-3 text-sm">
                <p>{t('पाहणी', 'Visit by')}: <b>{nameOf(c.assignedTo)}</b></p>
                {can('inspector', 'ward_officer') && <Link to={`/field/${c.id}`}><Button className="w-full">{t('Mobile app मध्ये पाहणी उघडा', 'Open visit in mobile app')}</Button></Link>}
              </div>
            )}

            {c.status === 'verified' && (can('assessment_officer', 'commissioner') ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm">{t('पाहणीत खात्री झाली. मागणी तपासून मंजूर करा.', 'Confirmed on site. Check the demand and approve.')}</p>
                <Field label={t('मंजूर मागणी (₹)', 'Approved demand (₹)')}>
                  <input id="approve-demand" type="number" className={inputCls} value={demand === '' ? c.estDemand : demand} onChange={e => setDemand(e.target.value === '' ? '' : +e.target.value)} />
                </Field>
                <Button onClick={() => st.approve(c.id, demand === '' ? c.estDemand : demand)}><CheckCircle2 size={16} />{t('मंजूर करा व नोटीस पाठवा', 'Approve and send notice')}</Button>
                <Button variant="secondary" onClick={() => st.dismiss(c.id)}>{t('कारवाई नाही, प्रकरण बंद करा', 'No action, close case')}</Button>
              </div>
            ) : <p className="text-sm text-muted">{t('कर निर्धारण अधिकाऱ्यांच्या मंजुरीसाठी प्रलंबित.', 'Awaiting assessment officer approval.')}</p>)}

            {c.status === 'not_found' && (can('assessment_officer', 'commissioner') ? (
              <div className="flex flex-col gap-3 text-sm">
                <p>{t('पाहणीत संशय खरा ठरला नाही.', 'Site visit did not confirm the flag.')}</p>
                <Button variant="secondary" onClick={() => st.dismiss(c.id)}>{t('प्रकरण बंद करा', 'Close case')}</Button>
              </div>
            ) : <p className="text-sm text-muted">{t('संशय खरा ठरला नाही.', 'Flag not confirmed.')}</p>)}

            {c.status === 'notice_sent' && (
              <div className="flex flex-col gap-3 text-sm">
                <p>{t('नोटीस', 'Notice')} <b className="font-mono">{c.noticeNo}</b> · {dmy(c.noticeDate)}</p>
                <p>{t('मागणी', 'Demand')}: <b className="tnum">{inr(c.approvedDemand ?? 0)}</b></p>
                {can('recovery_clerk', 'assessment_officer') && <Button onClick={() => st.recordPayment(c.id)}>{t('भरणा नोंदवा', 'Record payment')}</Button>}
              </div>
            )}

            {c.status === 'objection' && (can('hearing_officer') ? (
              <div className="flex flex-col gap-3">
                <Field label={t('सुनावणी शेरा', 'Hearing note')}>
                  <textarea id="hearing-note" className={inputCls} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder={t('उदा. पुन्हा मोजणी केली, क्षेत्रफळ बरोबर आढळले.', 'e.g. Re-measured; area found correct.')} />
                </Field>
                <Field label={t('सुधारित मागणी (हरकत मान्य केल्यास)', 'Revised demand (if upheld)')}>
                  <input id="hearing-revised" type="number" className={inputCls} value={revised} onChange={e => setRevised(e.target.value === '' ? '' : +e.target.value)} placeholder={String(Math.round((c.approvedDemand ?? 0) * 0.85))} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => st.decideObjection(c.id, true, note || t('हरकत मान्य.', 'Objection upheld.'), revised === '' ? Math.round((c.approvedDemand ?? 0) * 0.85) : revised)}>{t('मान्य करा', 'Uphold')}</Button>
                  <Button variant="secondary" onClick={() => st.decideObjection(c.id, false, note || t('पाहणी अहवाल ग्राह्य. हरकत फेटाळली.', 'Site report stands. Objection rejected.'))}>{t('फेटाळा', 'Reject')}</Button>
                </div>
              </div>
            ) : <p className="text-sm text-muted">{t('सुनावणी अधिकाऱ्यांकडे प्रलंबित.', 'Pending with the hearing officer.')}</p>)}

            {c.status === 'recovered' && <Notice tone="ok">{t('वसूल', 'Recovered')}: <b className="tnum">{inr(c.recovered ?? 0)}</b></Notice>}
            {c.status === 'closed' && <Notice tone="neutral">{t('प्रकरण बंद.', 'Case closed.')}</Notice>}
          </Card>

          <Card title={t('मागणीचा अंदाज', 'Demand estimate')}>
            <div className="tnum text-2xl font-bold">{c.estDemand ? inr(c.estDemand) : t('नोंद दुरुस्ती', 'Record correction')}</div>
            <p className="mt-1 text-xs text-muted">{t('क्षेत्रफळ × वापरानुसार दर × मागील कालावधी (Demo दर).', 'Area × usage rate × back period (demo rates).')}</p>
          </Card>

          <Card title={t('स्थान', 'Location')}>
            <MiniMap p={p} height={150} />
            <p className="mt-2 text-sm">{t('प्रभाग', 'Ward')} {p.ward} · {WARD_NAMES[p.ward]}</p>
          </Card>
        </div>
      </div>

      <Modal open={showNotice} onClose={() => setShowNotice(false)} title={t('मागणी नोटीस', 'Demand notice')} wide>
        <NoticeLetter c={c} />
      </Modal>
    </>
  )
}
