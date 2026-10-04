import type { Case, Property } from '../data/types'
import { CITY, RATE } from '../data/mock'
import { RULES, USAGE } from '../lib/labels'
import { inr, num, dmy } from '../lib/format'

/** Demand notice preview. Always Marathi, as issued by the municipal office. Marked as a demo sample. */
export function NoticeLetter({ c, p }: { c: Case; p: Property }) {
  return (
    <div className="relative overflow-hidden rounded border border-line bg-white p-6 text-[15px] leading-relaxed">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-7xl font-bold text-bad/10 select-none [transform:rotate(-20deg)]">नमुना · DEMO</div>
      <div className="text-center">
        <div className="font-display text-xl">{CITY.mr}</div>
        <div className="text-sm text-muted">कर निर्धारण विभाग</div>
        <div className="mt-2 font-bold">मालमत्ता कर आकारणी व मागणी नोटीस</div>
      </div>
      <div className="mt-4 flex justify-between text-sm"><span>जावक क्र.: <b className="font-mono">{c.noticeNo}</b></span><span>दिनांक: {dmy(c.noticeDate)}</span></div>
      <p className="mt-4">प्रति,<br /><b>{p.owner}</b><br />{p.address}<br />मालमत्ता Passport: <span className="font-mono">{p.id}</span></p>
      <p className="mt-4">महानगरपालिकेच्या अभिलेखांची इतर विभागांच्या नोंदींशी जुळवणी केली असता खालील बाब निदर्शनास आली:</p>
      <ul className="mt-2 list-disc pl-6">{c.rules.map(r => <li key={r}>{RULES[r].mr}</li>)}</ul>
      <p className="mt-3">दिनांक {dmy(c.visit?.date)} रोजी प्रत्यक्ष पाहणी करण्यात आली. पाहणीत बांधकाम {USAGE[c.visit?.usageFound ?? p.usage].mr} वापरात असल्याचे व मोजलेले क्षेत्रफळ {num(c.visit?.measuredArea ?? p.area)} चौ.फूट असल्याचे आढळले.</p>
      <table className="mt-3 w-full border-collapse text-sm">
        <tbody className="[&_td]:border [&_td]:border-line [&_td]:px-2 [&_td]:py-1">
          <tr><td>आकारणी दर (Demo)</td><td className="tnum">₹{RATE[c.visit?.usageFound ?? p.usage]} प्रति चौ.फूट प्रति वर्ष</td></tr>
          <tr><td>एकूण मागणी (मागील कालावधीसह)</td><td className="tnum font-bold">{inr(c.approvedDemand ?? c.estDemand)}</td></tr>
        </tbody>
      </table>
      <p className="mt-3">सदर रक्कम नोटीस मिळाल्यापासून ३० दिवसांत भरावी. या आकारणीबाबत हरकत असल्यास याच मुदतीत ऑनलाईन किंवा कार्यालयात हरकत नोंदवता येईल.</p>
      <div className="mt-6 text-right text-sm">कर निर्धारण अधिकारी<br />{CITY.mr}</div>
      <p className="mt-4 border-t border-line pt-2 text-xs text-muted">हा नमुना Demo साठी आहे. कायदेशीर संदर्भ, दर आणि मजकूर संबंधित महानगरपालिकेच्या नियमानुसार अंतिम केले जातील.</p>
    </div>
  )
}
