import { Link } from 'react-router-dom'
import { useStore } from '../store/store'
import { useApi } from '../api/useApi'
import { dmy } from '../lib/format'
import { Badge, Card, PageHeader, Table } from '../components/ui'

const TEMPLATES = [
  { id: 'notice', mr: 'नोटीस सूचना', en: 'Notice alert', body: 'नमस्कार, आपल्या मालमत्तेबाबत (Passport {ID}) मालमत्ता कर मागणी नोटीस {NOTICE} जारी झाली आहे. तपशील व हरकत: {LINK} — नमुनानगर महानगरपालिका' },
  { id: 'visit', mr: 'पाहणी पूर्वसूचना', en: 'Visit intimation', body: 'नमस्कार, आपल्या मालमत्तेची ({ID}) प्रत्यक्ष पाहणी {DATE} रोजी होणार आहे. — नमुनानगर महानगरपालिका' },
  { id: 'hearing', mr: 'सुनावणी दिनांक', en: 'Hearing date', body: 'आपल्या हरकतीवर सुनावणी {DATE} रोजी {TIME} वाजता सुनावणी कक्षात होईल. — नमुनानगर महानगरपालिका' },
  { id: 'receipt', mr: 'भरणा पावती', en: 'Payment receipt', body: '₹{AMOUNT} भरणा प्राप्त झाला. पावती क्र. {RECEIPT}. धन्यवाद. — नमुनानगर महानगरपालिका' },
]

export default function Notifications() {
  const { t, lang } = useStore()
  const { data } = useApi<{ id: number; case_id: string; channel: 'SMS' | 'WhatsApp'; template: string; sent_at: string }[]>('/messages')
  const messages = data ?? []
  return (
    <>
      <PageHeader title={t('सूचना: SMS / WhatsApp', 'Notifications: SMS / WhatsApp')} sub={t('नागरिकांना app download करावे लागत नाही. सर्व सूचना मराठीत.', 'Citizens need no app. All messages in Marathi.')} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('संदेश नमुने', 'Templates')}>
          <div className="flex flex-col gap-3">
            {TEMPLATES.map(x => (
              <div key={x.id} className="rounded border border-line p-3">
                <div className="mb-1 flex items-center justify-between"><b className="text-sm">{lang === 'mr' ? x.mr : x.en}</b><span className="flex gap-1"><Badge tone="info">SMS</Badge><Badge tone="ok">WhatsApp</Badge></span></div>
                <p className="rounded bg-paper p-2 text-sm">{x.body}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card title={t('पाठवलेले संदेश', 'Sent messages')}>
          <Table head={[t('वेळ', 'Time'), t('माध्यम', 'Channel'), t('नमुना', 'Template'), t('प्रकरण', 'Case')]} empty={!messages.length}>
            {messages.map(m => (
              <tr key={m.id}><td className="tnum">{dmy(m.sent_at)}</td><td><Badge tone={m.channel === 'SMS' ? 'info' : 'ok'}>{m.channel}</Badge></td><td>{m.template}</td><td><Link className="font-mono text-xs text-info underline" to={`/cases/${m.case_id}`}>{m.case_id}</Link></td></tr>
            ))}
          </Table>
          {!messages.length && <p className="text-center text-xs text-muted">{t('एखादे प्रकरण मंजूर केल्यावर संदेश येथे दिसतील.', 'Messages appear here once a case is approved.')}</p>}
        </Card>
      </div>
    </>
  )
}
