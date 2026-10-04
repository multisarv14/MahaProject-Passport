import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/store'
import { CIDCO_FLAGS } from '../lib/labels'
import { Badge, Card, Notice, PageHeader, Table, Tabs } from '../components/ui'

type Tab = 'mcgm' | 'cidco'

export default function UseModels() {
  const { t, lang } = useStore()
  const [tab, setTab] = useState<Tab>('mcgm')
  return (
    <>
      <PageHeader eyebrow={t('एक engine, अनेक संस्था', 'One engine, many bodies')} title={t('MCGM व CIDCO मध्ये वापर', 'Use at MCGM and CIDCO')}
        sub={t('मोठ्या संस्थांमध्ये तीच प्रणाली कशी लागू होईल: कोणता data, कोणते नियम आणि कसा टप्प्याटप्प्याने विस्तार.', 'How the same system applies to large bodies: which data, which rules, and how to roll out in phases.')} />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'mcgm', label: t('बृहन्मुंबई महानगरपालिका (MCGM)', 'Brihanmumbai Municipal Corporation (MCGM)') },
        { id: 'cidco', label: 'CIDCO' },
      ]} />

      {tab === 'mcgm' && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card><div className="text-sm text-muted">{t('मालमत्ता कर वसुली, २०२५-२६', 'Property tax collected, FY 2025-26')}</div><div className="mt-1 font-display text-3xl">₹७,६१०.९० {t('कोटी', 'Cr')}</div><p className="mt-1 text-xs text-muted">{t('MCGM ची आतापर्यंतची सर्वाधिक वसुली', "MCGM's highest ever")}</p></Card>
            <Card><div className="text-sm text-muted">{t('फक्त १% सुधारणा', 'Just a 1% improvement')}</div><div className="mt-1 font-display text-3xl">≈ ₹७६ {t('कोटी / वर्ष', 'Cr / yr')}</div><p className="mt-1 text-xs text-muted">{t('चुकलेली आकारणी व वापरबदल शोधल्यास', 'from missed assessments and changes of use')}</p></Card>
            <Card><div className="text-sm text-muted">{t('कर पद्धत', 'Tax basis')}</div><div className="mt-1 font-display text-3xl">{t('भांडवली मूल्य', 'Capital value')}</div><p className="mt-1 text-xs text-muted">{t('वापरानुसार दर वेगळे: स्वतः वापर, भाड्याने, व्यावसायिक', 'Rates differ by use: self-occupied, let out, commercial')}</p></Card>
          </div>
          <Card title={t('Data स्रोत: मुंबईसाठी बदल', 'Data sources: what changes for Mumbai')}>
            <Table head={[t('विभाग', 'Source'), t('मुंबईत कोण', 'Who in Mumbai'), t('जोडणी', 'Connection'), t('काय पकडले जाईल', 'What it catches')]}>
              <tr><td>{t('मालमत्ता कर', 'Property tax')}</td><td>{t('MCGM कर निर्धारण व संकलन विभाग', 'MCGM Assessment & Collection')}</td><td><Badge tone="ok">{t('अंतर्गत', 'Internal')}</Badge></td><td>{t('मूळ आधार', 'Base register')}</td></tr>
              <tr><td>{t('बांधकाम / OC', 'Building / OC')}</td><td>{t('MCGM इमारत प्रस्ताव विभाग; SRA प्रकल्प', 'MCGM Building Proposals; SRA projects')}</td><td><Badge tone="ok">{t('अंतर्गत', 'Internal')}</Badge></td><td>{t('नवीन व पुनर्विकसित इमारती करात नाहीत', 'New and redeveloped buildings not on the roll')}</td></tr>
              <tr><td>{t('वीज', 'Electricity')}</td><td>BEST · Adani Electricity · Tata Power · MSEDCL</td><td><Badge tone="info">{t('४ API keys', '4 API keys')}</Badge></td><td>{t('व्यावसायिक वीज, निवासी कर', 'Commercial power, residential tax')}</td></tr>
              <tr><td>{t('नोंदणी', 'Registration')}</td><td>IGR</td><td><Badge tone="ok">{t('MCGM शी आधीच देवाणघेवाण', 'Already exchanges with MCGM')}</Badge></td><td>{t('मालक बदल; भाड्याने दिलेल्या मालमत्ता (Leave & License)', 'Owner change; let-out property (Leave & License)')}</td></tr>
              <tr><td>{t('पाणी', 'Water')}</td><td>{t('MCGM जल अभियंता विभाग', 'MCGM Hydraulic Engineering')}</td><td><Badge tone="ok">{t('अंतर्गत', 'Internal')}</Badge></td><td>{t('जोडणी आहे, कर नाही', 'Connection, no tax')}</td></tr>
            </Table>
            <p className="mt-3 text-xs text-muted">{t('Leave & License नोंदणी दाखवते की मालमत्ता भाड्याने दिली आहे; भांडवली मूल्य पद्धतीत भाड्याच्या मालमत्तेचा दर स्वतः वापरापेक्षा जास्त असतो.', 'Leave & License registrations show a property is let out; under capital value, let-out property carries a higher rate than self-occupied.')}</p>
          </Card>
          <Card title={t('मुंबईसाठी rollout', 'Rollout for Mumbai')}>
            <Table head={[t('टप्पा', 'Phase'), t('काय', 'What'), t('कालावधी', 'Duration')]}>
              <tr><td>१</td><td>{t('२ वॉर्ड pilot (एक शहर विभाग, एक उपनगर); कर + OC + एक वीज कंपनी', '2-ward pilot (one city, one suburban); tax + OC + one power utility')}</td><td>{t('४ महिने', '4 months')}</td></tr>
              <tr><td>२</td><td>{t('सर्व वॉर्ड; चारही वीज कंपन्या; IGR Leave & License', 'All wards; all four utilities; IGR Leave & License')}</td><td>{t('६–९ महिने', '6–9 months')}</td></tr>
              <tr><td>३</td><td>{t('प्रकल्प Passport: इमारत प्रस्ताव ते OC', 'Project Passport: building proposal to OC')}</td><td>{t('पुढील वर्ष', 'Following year')}</td></tr>
            </Table>
            <p className="mt-3 text-xs text-muted">{t('लाखो मालमत्तांसाठी जुळवणी database मध्येच (PostgreSQL pg_trgm) आणि वॉर्डनिहाय चालवली जाते; प्रत्येक वॉर्ड अधिकाऱ्याला फक्त त्याचा वॉर्ड.', 'For millions of records, matching runs inside the database (PostgreSQL pg_trgm) ward by ward; each ward officer sees only their ward.')}</p>
          </Card>
        </div>
      )}

      {tab === 'cidco' && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card><div className="text-sm text-muted">{t('भूखंड कसे दिले जातात', 'How plots are held')}</div><div className="mt-1 font-display text-3xl">{t('भाडेपट्टा', 'Leasehold')}</div><p className="mt-1 text-xs text-muted">{t('विक्रीसाठी CIDCO ची NOC व हस्तांतरण शुल्क', 'Resale needs a CIDCO NOC and transfer charge')}</p></Card>
            <Card><div className="text-sm text-muted">{t('हस्तांतरण शुल्क', 'Transfer charge')}</div><div className="mt-1 font-display text-3xl">₹२५ {t('हजार – ₹१० लाख', 'k – ₹10 L')}</div><p className="mt-1 text-xs text-muted">{t('क्षेत्रफळानुसार; २०२३-२४ मध्ये ₹१२८ कोटी अपेक्षित', 'by size; ₹128 Cr projected in 2023-24')}</p></Card>
            <Card><div className="text-sm text-muted">{t('मालमत्ता कर', 'Property tax')}</div><div className="mt-1 font-display text-3xl">NMMC / PMC</div><p className="mt-1 text-xs text-muted">{t('CIDCO भाडेपट्टा व शुल्क; कर महानगरपालिका', 'CIDCO handles lease and charges; tax goes to the corporation')}</p></Card>
          </div>
          <Card title={t('CIDCO साठी नियम', 'Rules for CIDCO')} action={<Link to="/cidco" className="text-sm text-info underline">{t('Demo पहा →', 'Open demo →')}</Link>}>
            <Table head={[t('नियम', 'Rule'), t('वर्णन', 'Description'), t('Data', 'Data')]}>
              {(Object.keys(CIDCO_FLAGS) as (keyof typeof CIDCO_FLAGS)[]).map(f => (
                <tr key={f}><td className="font-mono font-bold">{f}</td><td>{CIDCO_FLAGS[f][lang]}</td><td>{{ C1: 'CIDCO Estate + IGR', C2: 'CIDCO Estate + MSEDCL', C3: 'CIDCO Estate + OC', C4: 'CIDCO Estate', C5: 'CIDCO Estate + OC + MSEDCL' }[f]}</td></tr>
              ))}
            </Table>
          </Card>
          <Notice tone="info">{t('एकाच data मधून दोन संस्थांना फायदा: CIDCO ला हस्तांतरण / वापरबदल शुल्क, आणि NMMC / पनवेल महानगरपालिकेला मालमत्ता कर.', 'One dataset helps two bodies: CIDCO recovers transfer / change-of-use charges, and NMMC / Panvel corporation recover property tax.')}</Notice>
        </div>
      )}
    </>
  )
}
