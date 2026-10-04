import type { Property } from '../data/types'
import { USAGE } from '../lib/labels'
import { useStore } from '../store/store'
import { num, dmy } from '../lib/format'
import { Badge, cx } from './ui'

/** Side-by-side view of what each department says about one property. Mismatches are marked red. */
export function SourceComparison({ p }: { p: Property }) {
  const { t, lang } = useStore()
  const cols = [
    { key: 'tax', mr: 'मालमत्ता कर', en: 'Property tax', has: !!p.tax },
    { key: 'oc', mr: 'नगररचना (OC)', en: 'Town planning (OC)', has: !!p.oc },
    { key: 'elec', mr: 'MSEDCL', en: 'MSEDCL', has: !!p.elec },
    { key: 'igr', mr: 'IGR', en: 'IGR', has: !!p.igr },
    { key: 'water', mr: 'पाणीपुरवठा', en: 'Water', has: !!p.water },
  ]
  const elecUsage = p.elec ? (p.elec.category === 'LT-II व्यावसायिक' ? 'commercial' : 'residential') : undefined
  const rows: { label: string; vals: (string | undefined)[]; bad?: boolean[] }[] = [
    {
      label: t('मालक', 'Owner'),
      vals: [p.tax?.owner, undefined, undefined, p.igr?.buyer, undefined],
      bad: [!!(p.igr && p.tax && p.tax.owner !== p.igr.buyer), false, false, false, false],
    },
    {
      label: t('वापर', 'Usage'),
      vals: [p.tax && USAGE[p.tax.usage][lang], undefined, elecUsage && USAGE[elecUsage as 'commercial'][lang], undefined, undefined],
      bad: [!!(p.tax && elecUsage && p.tax.usage === 'residential' && elecUsage === 'commercial'), false, false, false, false],
    },
    {
      label: t('क्षेत्रफळ (चौ.फूट)', 'Area (sq ft)'),
      vals: [p.tax && num(p.tax.assessedArea), p.oc && num(p.oc.builtUpArea), undefined, undefined, undefined],
      bad: [!!(p.tax && p.oc && p.oc.builtUpArea > p.tax.assessedArea * 1.1), false, false, false, false],
    },
    {
      label: t('क्रमांक', 'Reference'),
      vals: [p.tax?.taxNo, p.oc?.ocNo, p.elec?.consumerNo, p.igr?.docNo, p.water?.connNo],
    },
    {
      label: t('दिनांक', 'Date'),
      vals: [p.tax && t('शेवटचा भरणा ', 'Last paid ') + dmy(p.tax.lastPaid), p.oc && dmy(p.oc.date), p.elec && t('पासून ', 'Since ') + dmy(p.elec.since), p.igr && dmy(p.igr.date), p.water && t('पासून ', 'Since ') + dmy(p.water.since)],
    },
  ]
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="border-b border-line px-3 py-2" />
            {cols.map(c => (
              <th key={c.key} className="border-b border-line px-3 py-2">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-ink">{t(c.mr, c.en)}</span>
                  {c.has ? <Badge tone="ok">{t('नोंद आहे', 'Record found')}</Badge> : <Badge tone={c.key === 'tax' ? 'bad' : 'neutral'}>{t('नोंद नाही', 'No record')}</Badge>}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.label}>
              <th className="border-b border-line px-3 py-2 text-left text-xs font-semibold text-muted">{r.label}</th>
              {r.vals.map((v, i) => (
                <td key={i} className={cx('border-b border-line px-3 py-2', r.bad?.[i] && 'bg-bad-soft font-semibold text-bad')}>{v ?? <span className="text-line">—</span>}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Simple block-map placeholder: the city split into 8 wards, with the property marked. */
export function MiniMap({ p, height = 180 }: { p: Property; height?: number }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full rounded border border-line bg-paper" style={{ height }} role="img" aria-label="Location">
      {[0, 1, 2, 3].map(c => [0, 1].map(r => (
        <g key={`${c}${r}`}>
          <rect x={c * 25 + 1} y={r * 50 + 1} width={23} height={48} fill={p.ward === r * 4 + c + 1 ? '#F4EAD6' : '#FFFFFF'} stroke="#D8DCE6" strokeWidth={0.4} />
          <text x={c * 25 + 3} y={r * 50 + 7} fontSize={4} fill="#5A6177">{r * 4 + c + 1}</text>
        </g>
      )))}
      <line x1={0} y1={50} x2={100} y2={50} stroke="#B9BFCC" strokeWidth={1.2} />
      <line x1={50} y1={0} x2={50} y2={100} stroke="#B9BFCC" strokeWidth={1.2} />
      <circle cx={p.x} cy={p.y} r={2.4} fill="#B3261E" stroke="#fff" strokeWidth={0.8} />
    </svg>
  )
}
