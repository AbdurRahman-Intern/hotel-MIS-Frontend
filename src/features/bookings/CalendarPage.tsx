import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, format, getDaysInMonth, getDay, parseISO } from 'date-fns'
import { useBookings } from '@/hooks/queries'
import { useFormat } from '@/hooks/useFormat'
import { Card, DirIcon, IconButton, PageHeader, QueryBoundary } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatMonth } from '@/lib/formatters'

const tone: Record<string, string> = { confirmed: 'bg-emerald-100 text-emerald-800', pending: 'bg-amber-100 text-amber-800', completed: 'bg-blue-100 text-blue-800', draft: 'bg-slate-100 text-slate-600' }

export function CalendarPage() {
  const { t } = useTranslation()
  const { lang } = useFormat()
  const q = useBookings()
  const [cursor, setCursor] = useState(() => new Date())
  const ym = format(cursor, 'yyyy-MM')
  const first = getDay(parseISO(`${ym}-01`))
  const days = getDaysInMonth(cursor)
  const cells = Array.from({ length: first + days }, (_, i) => (i < first ? null : i - first + 1))
  const byDay = (d: number) => (q.data ?? []).filter((b) => b.status !== 'cancelled' && b.eventDate === `${ym}-${String(d).padStart(2, '0')}`)
  const wd = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(lang === 'fa-AF' ? 'fa-AF' : 'en-US', { weekday: 'short' }).format(new Date(2026, 0, 4 + i)))
  return (
    <>
      <PageHeader title={t('nav.calendar')} subtitle={t('bookings.calendarHint')} breadcrumbs={[{ label: t('nav.bookings'), to: '/hotel/bookings' }, { label: t('nav.calendar') }]}
        actions={<div className="flex items-center gap-2"><IconButton label={t('common.previous')} onClick={() => setCursor(addMonths(cursor, -1))}><DirIcon icon={ChevronLeft} className="size-5" /></IconButton><span className="min-w-36 text-center font-semibold">{formatMonth(ym, lang)}</span><IconButton label={t('common.next')} onClick={() => setCursor(addMonths(cursor, 1))}><DirIcon icon={ChevronRight} className="size-5" /></IconButton></div>} />
      <QueryBoundary queries={[q]}>
        <Card className="overflow-x-auto p-2">
          <div className="grid min-w-[640px] grid-cols-7 gap-px rounded-lg bg-line">
            {wd.map((d) => <div key={d} className="bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-muted">{d}</div>)}
            {cells.map((d, i) => (
              <div key={i} className={cn('min-h-24 bg-white p-1.5', d === null && 'bg-slate-50/50')}>
                {d !== null && <>
                  <p className="mb-1 text-xs font-medium text-muted">{d}</p>
                  <div className="space-y-1">{byDay(d).map((b) => <Link key={b.id} to={`/hotel/bookings/${b.id}`} className={cn('block truncate rounded px-1.5 py-0.5 text-[11px] font-medium', tone[b.status])} title={`${b.clientName} · ${b.hallName}`}>{t(`shift.${b.shift}`)} · {b.clientName}</Link>)}</div></>}
              </div>))}
          </div>
        </Card>
      </QueryBoundary>
    </>
  )
}
