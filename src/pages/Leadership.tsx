import { useStore } from '../store/store'
import { CITY, DISTRICT, DISTRICT_CITIES, PROPERTIES, STATE_DISTRICTS, WARDS, WARD_NAMES } from '../data/mock'
import { caseStats, wardOf } from '../lib/stats'
import { inrShort, num, pct } from '../lib/format'
import { Badge, BarRow, Card, Kpi, Notice, PageHeader, Table } from '../components/ui'

function useCities() {
  const { cases } = useStore()
  const s = caseStats(cases)
  return [
    { mr: CITY.mr, en: CITY.en, properties: PROPERTIES.length, cases: s.total, verified: s.confirmed, demand: s.demand, recovered: s.recovered, live: true },
    ...DISTRICT_CITIES,
  ]
}

export function DistrictDashboard() {
  const { t, lang } = useStore()
  const cities = useCities()
  const tot = cities.reduce((a, c) => ({ cases: a.cases + c.cases, verified: a.verified + c.verified, demand: a.demand + c.demand, recovered: a.recovered + c.recovered }), { cases: 0, verified: 0, demand: 0, recovered: 0 })
  const maxD = Math.max(...cities.map(c => c.demand))
  const stage = (c: typeof cities[number]) => c.live ? <Badge tone="ok">{t('Pilot चालू', 'Pilot live')}</Badge> : c.cases ? <Badge tone="info">{t('सुरू', 'Live')}</Badge> : <Badge tone="neutral">{t('नियोजित', 'Planned')}</Badge>

  return (
    <>
      <PageHeader eyebrow={t('जिल्हा', 'District')} title={t(DISTRICT.mr, DISTRICT.en)} sub={t('जिल्ह्यातील सर्व नागरी स्वराज्य संस्थांची तुलना', 'Comparison of all urban local bodies in the district')} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('संस्था (सुरू / एकूण)', 'Bodies (live / total)')} value={`${cities.filter(c => c.cases).length} / ${cities.length}`} />
        <Kpi label={t('संशयित प्रकरणे', 'Suspected cases')} value={num(tot.cases)} tone="warn" />
        <Kpi label={t('मंजूर मागणी', 'Approved demand')} value={inrShort(tot.demand, lang)} tone="file" />
        <Kpi label={t('वसुली', 'Collected')} value={inrShort(tot.recovered, lang)} sub={`${pct(tot.recovered, tot.demand)}%`} tone="ok" />
      </div>
      <Card className="mt-4" title={t('संस्थानिहाय स्थिती', 'Status by local body')}>
        <Table head={[t('संस्था', 'Local body'), t('टप्पा', 'Stage'), t('मालमत्ता', 'Properties'), t('प्रकरणे', 'Cases'), t('खात्री', 'Confirmed'), t('मंजूर मागणी', 'Demand'), t('वसुली', 'Collected'), '%']}>
          {cities.map(c => (
            <tr key={c.en}>
              <td className="font-semibold">{t(c.mr, c.en)}</td><td>{stage(c)}</td>
              <td className="tnum">{num(c.properties)}</td><td className="tnum">{num(c.cases)}</td><td className="tnum">{num(c.verified)}</td>
              <td className="tnum">{inrShort(c.demand, lang)}</td><td className="tnum">{inrShort(c.recovered, lang)}</td><td className="tnum">{pct(c.recovered, c.demand)}%</td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card className="mt-4" title={t('मंजूर मागणी: संस्थानिहाय', 'Approved demand by local body')}>
        <div className="flex flex-col gap-3">{cities.map(c => <BarRow key={c.en} label={t(c.mr, c.en)} value={c.demand} max={maxD} display={inrShort(c.demand, lang)} tone="file" />)}</div>
      </Card>
      <p className="mt-3 text-xs text-muted">{t('नमुनानगर वगळता इतर संस्थांचे आकडे स्थिर Demo आकडे आहेत.', 'Figures for bodies other than Namunanagar are static demo values.')}</p>
    </>
  )
}

export function StateDashboard() {
  const { t, lang } = useStore()
  const cities = useCities()
  const demand = cities.reduce((a, c) => a + c.demand, 0)
  const recovered = cities.reduce((a, c) => a + c.recovered, 0)
  return (
    <>
      <PageHeader eyebrow={t('राज्य', 'State')} title={t('महाराष्ट्र: महा पासपोर्ट', 'Maharashtra: Maha Passport')} sub={t('जिल्हानिहाय rollout आणि निकाल', 'District-wise rollout and results')} />
      <Notice tone="file">{t('Demo: खालील जिल्हे काल्पनिक आहेत. Pilot फक्त "नमुना जिल्हा" मध्ये चालू दाखवला आहे.', 'Demo: districts below are fictional. Only "Namuna District" shows a live pilot.')}</Notice>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('Pilot जिल्हे', 'Pilot districts')} value="1" />
        <Kpi label={t('सुरू संस्था', 'Live local bodies')} value={cities.filter(c => c.cases).length} />
        <Kpi label={t('मंजूर मागणी', 'Approved demand')} value={inrShort(demand, lang)} tone="file" />
        <Kpi label={t('वसुली', 'Collected')} value={inrShort(recovered, lang)} tone="ok" />
      </div>
      <Card className="mt-4" title={t('जिल्हानिहाय टप्पा', 'Stage by district')}>
        <Table head={[t('जिल्हा', 'District'), t('संस्था', 'Local bodies'), t('सुरू', 'Live'), t('टप्पा', 'Stage')]}>
          {STATE_DISTRICTS.map(d => (
            <tr key={d.en}>
              <td className="font-semibold">{t(d.mr, d.en)}</td><td className="tnum">{d.cities}</td><td className="tnum">{d.live}</td>
              <td>{d.pilot ? <Badge tone="ok">{t('वर्ष १: Pilot', 'Year 1: Pilot')}</Badge> : <Badge tone="neutral">{t('वर्ष २–३: नियोजित', 'Year 2–3: Planned')}</Badge>}</td>
            </tr>
          ))}
        </Table>
      </Card>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Card title={t('वर्ष १', 'Year 1')}><p className="text-sm">{t('एक शहर, तीन विभाग, Pilot अहवाल', 'One city, three departments, pilot report')}</p></Card>
        <Card title={t('वर्ष २', 'Year 2')}><p className="text-sm">{t('५–१० शहरे, IGR / पाणी / महसूल, API, व्यवसाय Passport', '5–10 cities, IGR / water / revenue, APIs, Business Passport')}</p></Card>
        <Card title={t('वर्ष ३', 'Year 3')}><p className="text-sm">{t('सर्व नागरी संस्था, MahaULB व ULPIN सोबत जोड, प्रकल्प Passport', 'All local bodies, MahaULB and ULPIN links, Project Passport')}</p></Card>
      </div>
    </>
  )
}

export function AreaSummary() {
  const { t, lang, cases } = useStore()
  const s = caseStats(cases)
  const rows = WARDS.map(w => ({ w, ...caseStats(cases.filter(c => wardOf(c) === w)) }))
  const max = Math.max(...rows.map(r => r.demand))
  return (
    <>
      <PageHeader eyebrow={t('लोकप्रतिनिधी', 'Elected representative')} title={t('नमुना मतदारसंघ: सारांश', 'Namuna Constituency: Summary')} sub={t('फक्त एकत्रित आकडे. नागरिकांची वैयक्तिक माहिती या दृश्यात दिसत नाही.', 'Aggregate figures only. No individual citizen data is shown here.')} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('शहरासाठी वाढीव मागणी', 'Additional demand for the city')} value={inrShort(s.demand, lang)} tone="file" />
        <Kpi label={t('आतापर्यंत वसूल', 'Collected so far')} value={inrShort(s.recovered, lang)} tone="ok" />
        <Kpi label={t('पाहणी पूर्ण', 'Site visits done')} value={num(s.visited)} tone="info" />
        <Kpi label={t('हरकतींचा निपटारा', 'Objections resolved')} value={cases.filter(c => c.objection?.decision).length} />
      </div>
      <Card className="mt-4" title={t('प्रभागनिहाय वाढीव मागणी', 'Additional demand by ward')}>
        <div className="flex flex-col gap-3">{rows.map(r => <BarRow key={r.w} label={`${r.w} · ${WARD_NAMES[r.w]}`} value={r.demand} max={max} display={inrShort(r.demand, lang)} tone="file" />)}</div>
      </Card>
      <div className="mt-4"><Notice tone="info">{t('हा निधी महानगरपालिकेच्या उत्पन्नात जमा होतो आणि शहरातील विकासकामांसाठी उपलब्ध होतो.', 'This revenue goes to the corporation and is available for city development works.')}</Notice></div>
    </>
  )
}
