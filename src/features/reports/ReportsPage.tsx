import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Banknote, CalendarCheck, Clock, Package, Printer, Receipt, Wallet } from 'lucide-react'
import { useBookings, useExpenses, useIncome, useItems } from '@/hooks/queries'
import { useFormat } from '@/hooks/useFormat'
import { calcBookingTotals, isRevenueBooking, stockValue, sum } from '@/lib/domain'
import { shortMonth } from '@/lib/formatters'
import { Button, EmptyState, PageHeader, QueryBoundary, SectionCard, Select, StatCard, StatusBadge, TableShell } from '@/components/ui'

const STATUSES = ['draft', 'pending', 'confirmed', 'completed', 'cancelled'] as const

/**
 * Definitions (kept deliberately separate, never merged into one "income" or "profit" number):
 *  - Booked revenue  = contractual total of non-cancelled bookings (accrual, NOT cash)
 *  - Cash received   = advances + recorded payments on those bookings (+ external income shown apart)
 *  - Outstanding     = booked revenue - cash received
 *  - Operating expenses = office expenses only. Partner withdrawals and loan repayments are NOT expenses.
 * TODO(laravel): move these aggregations to SQL (GET /reports/summary?year=).
 */
export function ReportsPage() {
  const { t } = useTranslation()
  const { money, num, date, compact, lang } = useFormat()
  const bookings = useBookings()
  const expenses = useExpenses()
  const income = useIncome()
  const items = useItems()
  const [year, setYear] = useState(new Date().getFullYear())

  const data = useMemo(() => {
    const bs = bookings.data ?? []
    const live = bs.filter(isRevenueBooking)
    const inYear = live.filter((b) => b.eventDate.startsWith(String(year)))
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, '0')}`
      const mb = inYear.filter((b) => b.eventDate.startsWith(key))
      return {
        label: shortMonth(i, lang),
        booked: sum(mb.map((b) => calcBookingTotals(b).estimatedTotal)),
        received: sum(mb.map((b) => calcBookingTotals(b).received)),
        expenses: sum((expenses.data ?? []).filter((x) => x.date.startsWith(key)).map((x) => x.amount)),
      }
    })
    const booked = sum(monthly.map((m) => m.booked))
    const received = sum(monthly.map((m) => m.received))
    const today = new Date().toISOString().slice(0, 10)
    return {
      monthly, booked, received, outstanding: Math.max(0, booked - received),
      opex: sum(monthly.map((m) => m.expenses)),
      external: sum((income.data ?? []).filter((x) => x.date.startsWith(String(year))).map((x) => x.amount)),
      byStatus: STATUSES.map((s) => ({ s, n: bs.filter((b) => b.status === s && b.eventDate.startsWith(String(year))).length })),
      owing: live.map((b) => ({ b, c: calcBookingTotals(b) })).filter((x) => x.c.remaining > 0).sort((a, b) => b.c.remaining - a.c.remaining).slice(0, 8),
      upcoming: live.filter((b) => b.eventDate >= today).sort((a, b) => a.eventDate.localeCompare(b.eventDate)).slice(0, 6),
      stock: sum((items.data ?? []).map(stockValue)),
    }
  }, [bookings.data, expenses.data, income.data, items.data, year, lang])

  return (
    <>
      <PageHeader title={t('reports.title')} subtitle={t('reports.subtitle')}
        actions={<><Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28" aria-label={t('dashboard.year')}>{[2026, 2025].map((y) => <option key={y} value={y}>{num(y)}</option>)}</Select>
          <Button variant="secondary" onClick={() => window.print()}><Printer className="size-4" />{t('common.print')}</Button></>} />
      <QueryBoundary queries={[bookings, expenses, income, items]}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={CalendarCheck} tone="blue" label={t('reports.booked')} value={money(data.booked)} hint={t('reports.bookedHint')} />
          <StatCard icon={Wallet} tone="green" label={t('reports.received')} value={money(data.received)} hint={t('reports.receivedHint')} />
          <StatCard icon={Clock} tone="amber" label={t('reports.outstanding')} value={money(data.outstanding)} hint={t('reports.outstandingHint')} />
          <StatCard icon={Receipt} tone="red" label={t('reports.opex')} value={money(data.opex)} hint={t('reports.opexHint')} />
          <StatCard icon={Banknote} tone="teal" label={t('reports.external')} value={money(data.external)} hint={t('reports.externalHint')} />
        </div>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{t('reports.noProfitNote')}</p>

        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <SectionCard title={t('reports.monthly')} subtitle={t('reports.monthlyHint', { year: num(year) })} className="xl:col-span-2">
            <div dir="ltr" className="h-72"><ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e8f1" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v: number) => compact(v)} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Legend />
                <Bar dataKey="booked" name={t('reports.booked')} fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="received" name={t('reports.received')} fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name={t('reports.opex')} fill="#f4577a" radius={[3, 3, 0, 0]} />
              </BarChart></ResponsiveContainer></div>
          </SectionCard>

          <div className="space-y-5">
            <SectionCard title={t('reports.bookingSummary')} subtitle={num(year)}>
              <ul className="divide-y divide-line text-sm">{data.byStatus.map(({ s, n }) => <li key={s} className="flex items-center justify-between py-2"><StatusBadge status={s} /><span className="font-semibold">{num(n)}</span></li>)}</ul>
            </SectionCard>
            <SectionCard title={t('reports.stockValue')}>
              <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-violet-50 text-violet-600"><Package className="size-5" /></span>
                <div><p className="text-xl font-bold">{money(data.stock)}</p><Link to="/hotel/inventory" className="text-xs text-brand-600">{t('reports.openInventory')}</Link></div></div>
            </SectionCard>
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <SectionCard title={t('reports.owing')} subtitle={t('reports.owingHint')}>
            {data.owing.length === 0 ? <EmptyState title={t('reports.noOwing')} /> : (
              <TableShell><thead><tr><th className="th">{t('bookings.client')}</th><th className="th">{t('bookings.eventDate')}</th><th className="th">{t('bookings.total')}</th><th className="th">{t('bookings.remaining')}</th></tr></thead>
                <tbody>{data.owing.map(({ b, c }) => <tr key={b.id} className="border-t border-line"><td className="td font-medium"><Link to={`/hotel/bookings/${b.id}`} className="hover:text-brand-600">{b.clientName}</Link></td><td className="td">{date(b.eventDate)}</td><td className="td">{money(c.estimatedTotal)}</td><td className="td font-semibold text-red-600">{money(c.remaining)}</td></tr>)}</tbody></TableShell>)}
          </SectionCard>
          <SectionCard title={t('reports.upcoming')}>
            {data.upcoming.length === 0 ? <EmptyState title={t('dashboard.noUpcoming')} /> : (
              <TableShell><thead><tr><th className="th">{t('bookings.eventDate')}</th><th className="th">{t('bookings.client')}</th><th className="th">{t('bookings.hall')}</th><th className="th">{t('bookings.guests')}</th></tr></thead>
                <tbody>{data.upcoming.map((b) => <tr key={b.id} className="border-t border-line"><td className="td">{date(b.eventDate)}<span className="block text-xs text-muted">{t(`shift.${b.shift}`)}</span></td><td className="td font-medium">{b.clientName}</td><td className="td">{b.hallName}</td><td className="td">{num(b.guestCount)}</td></tr>)}</tbody></TableShell>)}
          </SectionCard>
        </div>
      </QueryBoundary>
    </>
  )
}
