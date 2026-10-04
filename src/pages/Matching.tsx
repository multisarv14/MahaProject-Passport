import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import { useStore } from '../store/store'
import { PERSONAS } from '../data/mock'
import { RULES } from '../lib/labels'
import { useApi } from '../api/useApi'
import { summarize } from '../api/adapters'
import type { ApiStats } from '../api/types'
import { dmy, num } from '../lib/format'
import { Badge, Button, Card, Notice, PageHeader, Table } from '../components/ui'
import type { RuleId } from '../data/types'

const RULE_SOURCES: Record<RuleId, string> = {
  R1: 'OC + कर', R2: 'MSEDCL + कर', R3: 'MSEDCL + कर', R4: 'IGR + कर', R5: 'OC + कर', R6: 'पाणी + कर',
}

export default function Matching() {
  const st = useStore()
  const { t, lang, runs } = st
  const stats = useApi<ApiStats>('/stats')
  const s = stats.data ? summarize(stats.data) : { total: 0, ruleCount: {} as Record<string, number> }
  const [running, setRunning] = useState(0)
  const [steps, setSteps] = useState<string[]>([])

  const run = () => {
    const all = [
      t('पत्ते प्रमाणित करणे (मराठी / English)', 'Normalising addresses (Marathi / English)'),
      t('नाव व पत्ता यांची जुळवणी', 'Matching names and addresses'),
      t('नकाशावरील जवळीक तपासणे', 'Checking map proximity'),
      t('नियम R1–R6 लागू करणे', 'Applying rules R1–R6'),
      t('संशयित यादी तयार', 'Suspect list ready'),
    ]
    setSteps([]); setRunning(1)
    all.forEach((x, i) => setTimeout(() => {
      setSteps(p => [...p, x])
      if (i === all.length - 1) { setRunning(0); st.addRun(s.total) }
    }, 600 * (i + 1)))
  }

  return (
    <>
      <PageHeader
        title={t('जुळवणी (Matching)', 'Matching')}
        sub={t('एकाच मालमत्तेच्या विभागांतील नोंदी जोडून फरक शोधणे. रोज पहाटे आपोआप चालते.', 'Links each department\'s records for the same property and finds gaps. Runs automatically every morning.')}
        actions={<Button onClick={run} disabled={!!running}><Play size={16} />{running ? t('चालू आहे…', 'Running…') : t('आत्ता जुळवणी चालवा', 'Run matching now')}</Button>}
      />
      {steps.length > 0 && (
        <Card className="mb-4">
          <ol className="flex flex-col gap-1 text-sm">{steps.map((x, i) => <li key={i} className="flex items-center gap-2"><Badge tone="ok">✓</Badge>{x}</li>)}</ol>
        </Card>
      )}
      <Card title={t('जुळवणीचे नियम', 'Matching rules')}>
        <Table head={[t('नियम', 'Rule'), t('वर्णन', 'Description'), t('विभाग', 'Sources'), t('प्रकरणे', 'Cases'), t('स्थिती', 'Status')]}>
          {(Object.keys(RULES) as RuleId[]).map(r => (
            <tr key={r}>
              <td className="font-mono font-bold">{r}</td>
              <td>{RULES[r][lang]}</td>
              <td>{RULE_SOURCES[r]}</td>
              <td className="tnum"><Link className="text-info underline" to="/cases">{num(s.ruleCount[r] ?? 0)}</Link></td>
              <td><Badge tone="ok">{t('सुरू', 'Active')}</Badge></td>
            </tr>
          ))}
        </Table>
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t('जुळवणी कशी होते', 'How matching works')}>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
            <li>{t('पत्ता, मालकाचे नाव आणि क्रमांक प्रमाणित केले जातात (मराठी व English).', 'Address, owner name and numbers are normalised (Marathi and English).')}</li>
            <li>{t('प्रत्येक जोडीला विश्वास टक्केवारी दिली जाते. ७०% पेक्षा कमी असल्यास प्रकरण उघडत नाही.', 'Every link gets a confidence score. Below 70% no case is opened.')}</li>
            <li>{t('प्रत्येक प्रकरणासोबत कोणत्या नोंदीमुळे संशय आला ते जतन होते.', 'Each case keeps the exact records that triggered it.')}</li>
          </ul>
          <div className="mt-3"><Notice tone="info">{t('प्रणाली निर्णय घेत नाही. प्रत्येक प्रकरणात प्रत्यक्ष पाहणी आणि अधिकाऱ्याची मंजुरी आवश्यक आहे.', 'The system never decides. Every case needs a site visit and officer approval.')}</Notice></div>
        </Card>
        <Card title={t('जुळवणी इतिहास', 'Run history')}>
          <Table head={[t('वेळ', 'Time'), t('कोणी', 'By'), t('एकूण संशयित', 'Total flagged'), t('नवीन', 'New')]}>
            {runs.slice(0, 8).map((r, i) => (
              <tr key={i}><td className="tnum">{dmy(r.at)}</td><td>{r.by === 'system' ? t('स्वयंचलित', 'Scheduled') : PERSONAS.find(p => p.id === r.by)?.name}</td><td className="tnum">{num(r.found)}</td><td className="tnum">{r.newCases}</td></tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  )
}
