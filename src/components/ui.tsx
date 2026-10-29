import { useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ChevronLeft, ChevronRight, ChevronsRight, Inbox, Loader2, Search, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { AppError } from '@/lib/axios'

// ---------- Direction-aware icon ----------
/** Mirrors only direction-bearing icons (back/next/prev) in RTL. Do NOT use for search, calendar, user, etc. */
export function DirIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return <Icon className={cn('rtl-flip', className)} aria-hidden />
}

// ---------- Button ----------
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  secondary: 'border border-line bg-white text-ink hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-muted hover:bg-slate-100',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
}
export function Button({ variant = 'primary', loading, className, children, disabled, ...rest }: ComponentProps<'button'> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={cn('inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60', variants[variant], className)}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

export function IconButton({ label, className, ...rest }: ComponentProps<'button'> & { label: string }) {
  return <button type="button" aria-label={label} title={label} {...rest} className={cn('rounded-md p-1.5 transition hover:bg-slate-100', className)} />
}

// ---------- Form controls ----------
export function Field({ label, required, error, hint, children, className }: { label: string; required?: boolean; error?: string; hint?: string; children: ReactNode; className?: string }) {
  const { t } = useTranslation()
  return (
    <label className={cn('block text-sm', className)}>
      <span className="mb-1.5 block font-medium text-ink">
        {label}
        {required && <span className="ms-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-xs text-red-600">{t(error, { defaultValue: error })}</span>}
    </label>
  )
}
export const Input = ({ className, ...p }: ComponentProps<'input'>) => <input {...p} className={cn('input', className)} />
export const Textarea = ({ className, ...p }: ComponentProps<'textarea'>) => <textarea rows={3} {...p} className={cn('input resize-y', className)} />
export const Select = ({ className, children, ...p }: ComponentProps<'select'>) => (
  <select {...p} className={cn('input appearance-none bg-[length:1rem] bg-no-repeat pe-8', className)} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2364708a'%3E%3Cpath d='M5.5 7.5l4.5 5 4.5-5z'/%3E%3C/svg%3E")`, backgroundPosition: 'var(--sel-pos, right 0.6rem center)' }}>
    {children}
  </select>
)

export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="input ps-9" />
    </div>
  )
}

// ---------- Cards ----------
export const Card = ({ className, ...p }: ComponentProps<'div'>) => <div {...p} className={cn('card', className)} />

export function SectionCard({ title, subtitle, action, children, className }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('card p-4 sm:p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

const tones = {
  blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600', purple: 'bg-violet-50 text-violet-600', teal: 'bg-teal-50 text-teal-600', pink: 'bg-pink-50 text-pink-600',
}
export type Tone = keyof typeof tones

export function StatCard({ icon: Icon, tone = 'blue', label, value, hint, trend }: { icon: LucideIcon; tone?: Tone; label: string; value: ReactNode; hint?: ReactNode; trend?: ReactNode }) {
  return (
    <div className="card flex items-start gap-3 p-4">
      <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', tones[tone])}><Icon className="size-5" /></span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted">{label}</p>
        <p className="mt-0.5 truncate text-xl font-bold text-ink">{value}</p>
        {(hint || trend) && <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">{trend}{hint}</p>}
      </div>
    </div>
  )
}

// ---------- Badges ----------
const badgeTones: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/15', blue: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  gray: 'bg-slate-100 text-slate-600 ring-slate-500/15', purple: 'bg-violet-50 text-violet-700 ring-violet-600/15',
  teal: 'bg-teal-50 text-teal-700 ring-teal-600/15',
}
export function Badge({ tone = 'gray', children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', badgeTones[tone])}>{children}</span>
}

const statusTone: Record<string, keyof typeof badgeTones> = {
  confirmed: 'green', completed: 'blue', pending: 'amber', draft: 'gray', cancelled: 'red', paid: 'green', active: 'green', inactive: 'gray',
  on_leave: 'amber', suspended: 'red', in_stock: 'green', low: 'amber', out: 'red', open: 'amber', partial: 'blue', settled: 'green',
  eligible: 'green', not_eligible: 'red', borrowed: 'amber', lent: 'blue',
}
export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  return <Badge tone={statusTone[status] ?? 'gray'}>{t(`status.${status}`, { defaultValue: status })}</Badge>
}

// ---------- Layout helpers ----------
export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-muted">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <DirIcon icon={ChevronRight} className="size-3" />}
          {it.to ? <Link to={it.to} className="hover:text-brand-600">{it.label}</Link> : <span className="text-ink">{it.label}</span>}
        </span>
      ))}
    </nav>
  )
}

export function PageHeader({ title, subtitle, actions, breadcrumbs }: { title: string; subtitle?: string; actions?: ReactNode; breadcrumbs?: { label: string; to?: string }[] }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {breadcrumbs && <div className="mb-1.5"><Breadcrumbs items={breadcrumbs} /></div>}
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

// ---------- States ----------
export function Spinner({ label }: { label?: string }) {
  return (
    <div className="grid place-items-center gap-2 py-16 text-muted" role="status">
      <Loader2 className="size-6 animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}

export function EmptyState({ title, description, action, icon: Icon = Inbox }: { title: string; description?: string; action?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="grid place-items-center gap-2 px-4 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400"><Icon className="size-6" /></span>
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation()
  const code = error instanceof AppError ? error.code : 'server'
  const msg = code === 'network' ? t('errors.network') : code === 'forbidden' ? t('errors.forbiddenRecord') : code === 'not_found' ? t('errors.notFoundRecord') : t('errors.generic')
  return (
    <div className="grid place-items-center gap-2 px-4 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-red-50 text-red-500"><AlertTriangle className="size-6" /></span>
      <p className="font-semibold text-ink">{t('errors.title')}</p>
      <p className="max-w-md text-sm text-muted">{msg}</p>
      {code === 'network' && <p className="max-w-md text-xs text-muted">{t('errors.networkHint')}</p>}
      {onRetry && <Button variant="secondary" onClick={onRetry}>{t('common.retry')}</Button>}
    </div>
  )
}

/** Renders loading / error states for a query, otherwise children. */
export function QueryBoundary({ queries, children }: { queries: { isLoading: boolean; error: unknown; refetch: () => unknown }[]; children: ReactNode }) {
  const { t } = useTranslation()
  const failed = queries.find((q) => q.error)
  if (failed) return <Card><ErrorState error={failed.error} onRetry={() => void failed.refetch()} /></Card>
  if (queries.some((q) => q.isLoading)) return <Spinner label={t('common.loading')} />
  return <>{children}</>
}

// ---------- Table + pagination ----------
export function TableShell({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[640px] border-collapse">{children}</table></div>
}

export function usePagination<T>(rows: T[], initialSize = 10, resetKey?: string) {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(initialSize)
  useEffect(() => setPage(1), [resetKey, size])
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const current = Math.min(page, pages)
  return { page: current, pages, size, setPage, setSize, slice: rows.slice((current - 1) * size, current * size), total: rows.length, from: rows.length ? (current - 1) * size + 1 : 0, to: Math.min(current * size, rows.length) }
}

export function Pagination({ p }: { p: ReturnType<typeof usePagination> }) {
  const { t } = useTranslation()
  if (p.total === 0) return null
  const nums = Array.from({ length: p.pages }, (_, i) => i + 1).filter((n) => n === 1 || n === p.pages || Math.abs(n - p.page) <= 1)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-3 py-3 text-sm text-muted">
      <span>{t('common.showing', { from: p.from, to: p.to, total: p.total })}</span>
      <div className="flex items-center gap-1">
        <button aria-label={t('common.previous')} disabled={p.page === 1} onClick={() => p.setPage(p.page - 1)} className="grid size-8 place-items-center rounded-md border border-line bg-white disabled:opacity-40"><DirIcon icon={ChevronLeft} className="size-4" /></button>
        {nums.map((n, i) => (
          <span key={n} className="flex items-center gap-1">
            {i > 0 && nums[i - 1] !== n - 1 && <span>…</span>}
            <button onClick={() => p.setPage(n)} aria-current={n === p.page} className={cn('grid size-8 place-items-center rounded-md border text-sm', n === p.page ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white hover:bg-slate-50')}>{n}</button>
          </span>
        ))}
        <button aria-label={t('common.next')} disabled={p.page === p.pages} onClick={() => p.setPage(p.page + 1)} className="grid size-8 place-items-center rounded-md border border-line bg-white disabled:opacity-40"><DirIcon icon={ChevronRight} className="size-4" /></button>
      </div>
      <label className="flex items-center gap-2">
        {t('common.perPage')}
        <select value={p.size} onChange={(e) => p.setSize(Number(e.target.value))} className="rounded-md border border-line bg-white px-2 py-1">
          {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
    </div>
  )
}

// ---------- Dialogs ----------
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-navy-950/50" onClick={onClose} />
      <div className={cn('relative max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white shadow-xl', wide ? 'max-w-2xl' : 'max-w-md')}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-base font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose}><X className="size-4" /></IconButton>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line bg-slate-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onClose, loading, tone = 'danger' }: { open: boolean; title: string; message: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; loading?: boolean; tone?: 'danger' | 'primary' }) {
  const { t } = useTranslation()
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<>
      <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
      <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
    </>}>
      <p className="text-sm text-muted">{message}</p>
    </Modal>
  )
}

export function LinkButton({ to, children, variant = 'primary', className }: { to: string; children: ReactNode; variant?: Variant; className?: string }) {
  return <Link to={to} className={cn('inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition', variants[variant], className)}>{children}</Link>
}

export const ChevronsIcon = ChevronsRight
