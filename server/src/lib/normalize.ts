// Address and name normalisation so that a Marathi record ("घर क्र. 64, शाळा रस्ता, स्टेशन परिसर")
// and an English one ("H.No. 64, Shala Road, Station Area") can be compared.

const CONS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n', 'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n', 'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'ळ': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
}
const VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऋ': 'ru', 'ॲ': 'a', 'ऑ': 'o',
}
const MATRAS: Record<string, string> = {
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ृ': 'ru', 'ॅ': 'e', 'ॉ': 'o',
}
const VIRAMA = '्'
const isDev = (ch: string | undefined) => !!ch && ch >= 'ऀ' && ch <= 'ॿ'

/** Devanagari → simple Latin. Drops the inherent vowel at word end, as spoken Marathi does. */
export function transliterate(input: string): string {
  let out = ''
  const s = [...input.normalize('NFC')]
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (CONS[ch]) {
      out += CONS[ch]
      let next = s[i + 1]
      if (next === '़') { i++; next = s[i + 1] } // nukta
      if (next && MATRAS[next]) { out += MATRAS[next]; i++ }
      else if (next === VIRAMA) { i++ }
      else if (isDev(next) && !['ं', 'ँ', 'ः'].includes(next) || ['ं', 'ँ'].includes(next ?? '')) { out += 'a' }
    } else if (VOWELS[ch]) out += VOWELS[ch]
    else if (ch === 'ं' || ch === 'ँ') out += 'n'
    else if (ch === 'ः') out += 'h'
    else if (ch >= '०' && ch <= '९') out += String(ch.charCodeAt(0) - '०'.charCodeAt(0))
    else if (MATRAS[ch]) out += MATRAS[ch]
    else out += ch
  }
  return out
}

// Same idea in different words → one key. Keys are compared after phonetic folding.
const SYNONYMS: [string[], string][] = [
  [['road', 'rd', 'rasta', 'rod', 'marg', 'marga', 'path'], 'road'],
  [['galli', 'gali', 'lane', 'ali', 'aali'], 'lane'],
  [['parisar', 'area', 'vibhag', 'bhag'], 'area'],
  [['chowk', 'chouk', 'chauk', 'square'], 'chowk'],
  [['peth', 'pet'], 'peth'],
  [['vasahat', 'colony', 'vasti'], 'colony'],
  [['navin', 'nava', 'navi', 'new'], 'new'],
  [['juna', 'juni', 'old'], 'old'],
  [['shala', 'school', 'vidyalay'], 'school'],
  [['talav', 'lake', 'tank'], 'lake'],
  [['sthanak', 'stand', 'stop', 'depot'], 'stand'],
  [['pul', 'bridge'], 'bridge'],
  [['mukhy', 'mukhya', 'main'], 'main'],
  [['bajar', 'bazar', 'market', 'mandai'], 'market'],
  [['audyogik', 'industrial', 'midc'], 'industrial'],
  [['mandir', 'temple'], 'temple'],
  [['nadikath', 'riverside', 'nadi'], 'river'],
  [['nagar', 'nagr'], 'nagar'],
]
const SYN = new Map<string, string>()
for (const [words, key] of SYNONYMS) for (const w of words) SYN.set(w, key)

// Words that carry no location information.
const STOP = new Set(['ghar', 'h', 'no', 'house', 'kr', 'kra', 'kramank', 'number', 'num', 'plot', 'flat', 'sadanika', 'shop', 'gala', 'at', 'post', 'po', 'ta', 'dist', 'near', 'javal', 'samor', 'opp', 'the', 'of', 'and', 'shri', 'shrimati', 'smt', 'mr', 'mrs'])

/** Fold spellings that sound alike: steshan / station, shala / sala, kh / k. */
export function phonetic(token: string): string {
  let t = token.toLowerCase()
  t = t.replace(/tion/g, 'shan')
  t = t.replace(/chh|ch/g, '§').replace(/c/g, 'k').replace(/§/g, 'c')
  t = t.replace(/sh/g, 's').replace(/ph/g, 'f').replace(/w/g, 'v').replace(/z/g, 'j').replace(/q/g, 'k').replace(/x/g, 'ks')
  t = t.replace(/([kgtdbjp])h/g, '$1')
  t = t.replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/aa/g, 'a').replace(/y/g, 'i')
  t = t.replace(/(.)\1+/g, '$1')
  return t
}

/** Consonant skeleton: the most stable part of a word across spellings. */
const skeleton = (t: string) => (t[0] ?? '') + t.slice(1).replace(/[aeiou]/g, '')

export interface Normalized { tokens: string[]; houseNo: string | null }

export function normalizeAddress(raw: string): Normalized {
  const latin = transliterate(raw).toLowerCase()
  const houseNo = latin.match(/\d+[a-z]?/)?.[0] ?? null
  const tokens: string[] = []
  for (const w of latin.split(/[^a-z0-9]+/)) {
    if (!w || STOP.has(w) || /^\d+[a-z]?$/.test(w)) continue
    const key = SYN.get(w) ?? SYN.get(phonetic(w)) ?? phonetic(w)
    if (key.length > 1) tokens.push(key)
  }
  return { tokens, houseNo }
}

export function normalizeName(raw: string): string[] {
  return transliterate(raw).toLowerCase().split(/[^a-z]+/).filter(w => w && !STOP.has(w)).map(phonetic)
}

function trigrams(s: string): Set<string> {
  const p = `  ${s} `
  const g = new Set<string>()
  for (let i = 0; i < p.length - 2; i++) g.add(p.slice(i, i + 3))
  return g
}
function dice(a: string, b: string): number {
  if (a === b) return 1
  const A = trigrams(a), B = trigrams(b)
  let n = 0
  for (const x of A) if (B.has(x)) n++
  return (2 * n) / (A.size + B.size)
}
const tokenSim = (a: string, b: string) => (a === b || skeleton(a) === skeleton(b) ? 1 : dice(a, b))

/** Symmetric soft token overlap in [0, 1]. */
export function tokenSetSimilarity(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const best = (x: string, ys: string[]) => Math.max(...ys.map(y => tokenSim(x, y)))
  const sa = a.reduce((s, x) => s + best(x, b), 0)
  const sb = b.reduce((s, y) => s + best(y, a), 0)
  return (sa + sb) / (a.length + b.length)
}
