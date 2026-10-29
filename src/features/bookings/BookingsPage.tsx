import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarCheck, CalendarHeart, Clock, Eye, Pencil, Plus, Wallet, XCircle, FileText, CalendarDays } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useBookings } from '@/hooks/queries'
import { useInvalidate } from '@/hooks/queries'
import { bookingService } from '@/services/bookings.service'
import { useFormat } from '@/hooks/useFormat'
import { calcBookingTotals, isRevenueBooking, sum } from '@/lib/domain'
import { Card, ConfirmDialog, EmptyState, IconButton, LinkButton, PageHeader, Pagination, QueryBoundary, SearchInput, SectionCard, Select, StatCard, StatusBadge, TableShell, Input, usePagination } from '@/components/ui'
import { BookingDetailPanel } from './BookingDetailPanel'
import type { Booking } from '@/types'

const STATUSES = ['draft', 'pending', 'confirmed', 'completed', 'cancelled']
const TYPES = ['Wedding', 'Engagement', 'Reception', 'Birthday', 'Corporate', 'Other']

export function BookingsPage() {
  const { t } = useTranslation()
  const { money, num, date } = useFormat()
  const [params] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toCancel, setToCancel] = useState<Booking | null>(null)
  const q = useBookings()
  const invalidate = useInvalidate()
  const cancelM = useMutation({ mutationFn: (id: string) => bookingService.cancelBooking(id), onSuccess: async () => { await invalidate('bookings'); toast.success(t('bookings.cancelled')); setToCancel(null) } })

  const all = q.data ?? []
  const rows = useMemo(() => all.filter((b) => {
    const s = search.trim().toLowerCase()
    return (!s || `${b.clientName} ${b.clientPhone} ${b.reference}`.toLowerCase().includes(s)) && (!status || b.status === status) && (!type || b.eventType === type) && (!from || b.eventDate >= from) && (!to || b.eventDate <= to)
  }).sort((a, b) => b.eventDate.localeCompare(a.eventDate)), [all, search, status, type, from, to])
  const p = usePagination(rows, 10, [search, status, type, from, to].join('|'))
  const selected = all.find((b) => b.id === selectedId) ?? p.slice[0]

  const ym = new Date().toISOString().slice(0, 7)
  const live = all.filter(isRevenueBooking)
  const monthRevenue = sum(live.filter((b) => b.eventDate.startsWith(ym)).map((b) => calcBookingTotals(b).estimatedTotal))
  const pending = live.filter((b) => calcBookingTotals(b).remaining > 0)

  return (
    <>
      <PageHeader title={t('bookings.title')} subtitle={t('bookings.subtitle')} actions={<>
        <LinkButton to="/hotel/bookings/calendar" variant="secondary"><CalendarDays className="size-4" />{t('nav.calendar')}</LinkButton>
        <LinkButton to="/hotel/bookings/hawala" variant="secondary"><FileText className="size-4" />{t('nav.hawala')}</LinkButton>
        <LinkButton to="/hotel/bookings/new"><Plus className="size-4" />{t('bookings.add')}</LinkButton></>} />
      <QueryBoundary queries={[q]}>
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={CalendarCheck} tone="blue" label={t('bookings.statMonth')} value={num(live.filter((b) => b.eventDate.startsWith(ym)).length)} />
          <StatCard icon={CalendarHeart} tone="pink" label={t('bookings.statYear')} value={num(live.length)} />
          <StatCard icon={Wallet} tone="green" label={t('bookings.statRevenue')} value={money(monthRevenue)} hint={t('bookings.bookedNote')} />
          <StatCard icon={Clock} tone="amber" label={t('bookings.statPending')} value={money(sum(pending.map((b) => calcBookingTotals(b).remaining)))} hint={t('bookings.pendingCount', { count: pending.length })} />
        </div>
        <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
          <Card>
            <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
              <SearchInput value={search} onChange={setSearch} placeholder={t('bookings.searchPlaceholder')} className="min-w-52 flex-1" />
              <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-36" aria-label={t('common.status')}><option value="">{t('common.allStatuses')}</option>{STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}</Select>
              <Select value={type} onChange={(e) => setType(e.target.value)} className="w-36" aria-label={t('bookings.eventType')}><option value="">{t('bookings.allTypes')}</option>{TYPES.map((s) => <option key={s} value={s}>{t(`eventTypes.${s}`)}</option>)}</Select>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" aria-label={t('common.from')} />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" aria-label={t('common.to')} />
            </div>
            {rows.length === 0 ? <EmptyState title={t('bookings.empty')} description={t('common.tryAdjusting')} action={<LinkButton to="/hotel/bookings/new"><Plus className="size-4" />{t('bookings.add')}</LinkButton>} /> : <>
              <TableShell>
                <thead><tr><th className="th">{t('bookings.reference')}</th><th className="th">{t('bookings.eventDate')}</th><th className="th">{t('bookings.client')}</th><th className="th">{t('bookings.eventType')}</th><th className="th">{t('bookings.hall')}</th><th className="th">{t('bookings.guests')}</th><th className="th">{t('bookings.total')}</th><th className="th">{t('bookings.advance')}</th><th className="th">{t('bookings.remaining')}</th><th className="th">{t('common.status')}</th><th className="th">{t('common.actions')}</th></tr></thead>
                <tbody>{p.slice.map((b) => {
                  const tot = calcBookingTotals(b)
                  return (
                    <tr key={b.id} onClick={() => setSelectedId(b.id)} className={`cursor-pointer border-t border-line hover:bg-slate-50 ${selected?.id === b.id ? 'bg-brand-50/60' : ''}`}>
                      <td className="td text-xs"><span className="ltr-isolate">{b.reference}</span></td>
                      <td className="td whitespace-nowrap">{date(b.eventDate)}<span className="block text-xs text-muted">{t(`shift.${b.shift}`)}</span></td>
                      <td className="td font-medium">{b.clientName}<span className="block text-xs font-normal text-muted ltr-isolate">{b.clientPhone}</span></td>
                      <td className="td">{t(`eventTypes.${b.eventType}`)}</td><td className="td">{b.hallName}</td><td className="td">{num(b.guestCount)}</td>
                      <td className="td whitespace-nowrap">{money(tot.estimatedTotal)}</td><td className="td whitespace-nowrap">{money(tot.received)}</td>
                      <td className={`td whitespace-nowrap ${tot.remaining > 0 && b.status !== 'cancelled' ? 'text-red-600' : ''}`}>{money(tot.remaining)}</td>
                      <td className="td"><StatusBadge status={b.status} /></td>
                      <td className="td"><div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <Link to={`/hotel/bookings/${b.id}`} aria-label={t('common.view')} title={t('common.view')} className="rounded-md p-1.5 text-brand-600 hover:bg-slate-100"><Eye className="size-4" /></Link>
                        {b.status !== 'cancelled' && <Link to={`/hotel/bookings/${b.id}/edit`} aria-label={t('common.edit')} title={t('common.edit')} className="rounded-md p-1.5 text-brand-600 hover:bg-slate-100"><Pencil className="size-4" /></Link>}
                        {b.status !== 'cancelled' && b.status !== 'completed' && <IconButton label={t('bookings.cancel')} className="text-red-500" onClick={() => setToCancel(b)}><XCircle className="size-4" /></IconButton>}
                      </div></td>
                    </tr>)
                })}</tbody>
              </TableShell>
              <Pagination p={p} />
            </>}
          </Card>
          {selected && <SectionCard title={t('bookings.details')} className="h-fit xl:sticky xl:top-20"><BookingDetailPanel booking={selected} /></SectionCard>}
        </div>
      </QueryBoundary>
      <ConfirmDialog open={!!toCancel} onClose={() => setToCancel(null)} loading={cancelM.isPending} title={t('bookings.cancel')} message={t('bookings.cancelConfirm', { name: toCancel?.clientName ?? '' })} confirmLabel={t('bookings.cancelYes')} onConfirm={() => toCancel && cancelM.mutate(toCancel.id)} />
    </>
  )
}
