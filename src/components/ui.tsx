import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { X } from 'lucide-react'
import type { Tone } from '../lib/labels'
import type { CaseStatus } from '../data/types'
import { STATUS } from '../lib/labels'
import { useStore } from '../store/store'

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

const toneCls: Record<Tone, string> = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  info: 'bg-info-soft text-info',
  file: 'bg-file-soft text-file',
  neutral: 'bg-paper text-muted',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx('inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap', toneCls[tone])}>{children}</span>
}

export function StatusBadge({ status }: { status: CaseStatus }) {
  const { lang } = useStore()
  const s = STATUS[status]
  return <Badge tone={s.tone}>{s[lang]}</Badge>
}

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cx('rounded-md border border-line bg-white', className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-[15px] font-bold">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'sm' | 'md' }
export function Button({ variant = 'primary', size = 'md', className, ...rest }: BtnProps) {
  const v = {
    primary: 'bg-ink text-white hover:bg-ink-soft',
    secondary: 'border border-line bg-white text-ink hover:bg-paper',
    danger: 'bg-bad text-white hover:opacity-90',
    ghost: 'text-ink hover:bg-paper',
  }[variant]
  const s = size === 'sm' ? 'px-2.5 py-1 text-sm' : 'px-4 py-2 text-[15px]'
  return <button {...rest} className={cx('inline-flex items-center justify-center gap-1.5 rounded font-semibold disabled:cursor-not-allowed disabled:opacity-50', v, s, className)} />
}

export function Kpi({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  const bar = tone ? { ok: 'border-ok', warn: 'border-warn', bad: 'border-bad', info: 'border-info', file: 'border-file', neutral: 'border-line' }[tone] : 'border-ink'
  return (
    <div className={cx('rounded-md border border-line bg-white p-4 border-t-[3px]', bar)}>
      <div className="text-sm text-muted">{label}</div>
      <div className="tnum mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  )
}

export function PageHeader({ title, sub, actions, eyebrow }: { title: string; sub?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <div className="text-xs font-semibold tracking-wide text-file uppercase">{eyebrow}</div>}
        <h1 className="font-display text-2xl leading-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            {head.map((h, i) => <th key={i} className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-line [&>tr:hover]:bg-paper/60 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top">
          {children}
        </tbody>
      </table>
      {empty && <p className="py-8 text-center text-sm text-muted">कोणतीही नोंद नाही.</p>}
    </div>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={cx('-mb-px border-b-2 px-3 py-2 text-sm font-semibold whitespace-nowrap', value === t.id ? 'border-file text-ink' : 'border-transparent text-muted hover:text-ink')}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 pt-[8vh]" onClick={onClose}>
      <div className={cx('w-full rounded-md bg-white shadow-xl', wide ? 'max-w-3xl' : 'max-w-lg')} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-paper"><X size={18} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold text-muted">{label}</span>
      {children}
    </label>
  )
}

export const inputCls = 'rounded border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-ink'

export function KV({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="flex flex-col border-b border-line/70 pb-1.5">
          <dt className="text-xs text-muted">{k}</dt>
          <dd className="font-medium">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

export function BarRow({ label, value, max, display, tone = 'info' }: { label: ReactNode; value: number; max: number; display?: ReactNode; tone?: Tone }) {
  const c = { ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', info: 'bg-info', file: 'bg-file', neutral: 'bg-muted' }[tone]
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
      <span className="truncate">{label}</span>
      <div className="h-2.5 rounded bg-paper"><div className={cx('h-2.5 rounded', c)} style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} /></div>
      <span className="tnum text-right font-semibold">{display ?? value}</span>
    </div>
  )
}

export function Notice({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  return <div className={cx('rounded-md px-3 py-2 text-sm', toneCls[tone])}>{children}</div>
}

export function Loading() {
  const { t } = useStore()
  return <p className="py-10 text-center text-sm text-muted">{t('माहिती आणत आहे…', 'Loading…')}</p>
}

export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useStore()
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">
      <span>{t('माहिती मिळाली नाही:', 'Could not load:')} {message}</span>
      {onRetry && <button className="underline" onClick={onRetry}>{t('पुन्हा प्रयत्न करा', 'Try again')}</button>}
    </div>
  )
}
