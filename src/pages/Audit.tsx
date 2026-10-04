import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/store'
import { PERSONAS } from '../data/mock'
import { ROLES } from '../lib/labels'
import { dmy } from '../lib/format'
import { Button, Card, PageHeader, Table, inputCls } from '../components/ui'

export default function Audit() {
  const { t, lang, audit } = useStore()
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(60)
  const rows = audit.filter(a => !q || [a.action, a.entity, PERSONAS.find(p => p.id === a.who)?.name].some(v => v?.includes(q)))
  return (
    <>
      <PageHeader title="Audit Log" sub={t('प्रत्येक महत्त्वाची कृती: कोणी, कोणत्या भूमिकेत, काय आणि कधी. नोंदी बदलता किंवा हटवता येत नाहीत.', 'Every important action: who, in which role, what and when. Entries cannot be edited or deleted.')} />
      <Card>
        <input id="audit-q" className={inputCls + ' mb-3 w-full sm:w-80'} placeholder={t('शोधा: प्रकरण, व्यक्ती, कृती', 'Search: case, person, action')} value={q} onChange={e => setQ(e.target.value)} />
        <Table head={[t('वेळ', 'Time'), t('व्यक्ती', 'User'), t('भूमिका', 'Role'), t('कृती', 'Action'), t('नोंद', 'Entity')]} empty={!rows.length}>
          {rows.slice(0, limit).map((a, i) => (
            <tr key={i}>
              <td className="tnum whitespace-nowrap">{dmy(a.at)}</td>
              <td>{PERSONAS.find(p => p.id === a.who)?.name ?? a.who}</td>
              <td>{ROLES[a.role][lang]}</td>
              <td>{a.action}</td>
              <td>{a.entity.startsWith('C-') ? <Link className="font-mono text-xs text-info underline" to={`/cases/${a.entity}`}>{a.entity}</Link> : <span className="font-mono text-xs">{a.entity}</span>}</td>
            </tr>
          ))}
        </Table>
        {rows.length > limit && <div className="mt-3 text-center"><Button variant="secondary" onClick={() => setLimit(l => l + 60)}>{t('अधिक दाखवा', 'Show more')}</Button></div>}
      </Card>
    </>
  )
}
