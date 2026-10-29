import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Banknote, CalendarCheck, CalendarClock, CalendarHeart, Coins, HandCoins, Package, PartyPopper, PiggyBank, Plus, Receipt, TrendingUp, Users, UserPlus, Wallet, Clock } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getHotelDashboard } from '@/services/dashboard.service'
import { useAuth } from '@/stores/auth.store'
import { useFormat } from '@/hooks/useFormat'
import { useOwnHotel } from '@/hooks/useOwnHotel'
import { calcBookingTotals } from '@/lib/domain'
import { LinkButton, PageHeader, QueryBoundary, SectionCard, Select, StatCard, StatusBadge, TableShell, EmptyState } from '@/components/ui'
import { shortMonth } from '@/lib/formatters'

const COLORS = ['#1f5bf0', '#8b5cf6', '#ec4899', '#f59e0b', '#94a3b8', '#0f9d8a']

export function HotelDashboard() {
  const { t } = useTranslation()
  const { money, num, date, compact, lang, pct } = useFormat()
  const tenantId = useAuth((s) => s.user?.tenantId)
  const { data: hotel } = useOwnHotel()
  const [year, setYear] = useState(new Date().getFullYear())
  const q = useQuery({ queryKey: ['dashboard', tenantId, year], queryFn: () => getHotelDashboard(year), enabled: !!tenantId })
  const d = q.data
  const monthly = d?.monthly.map((m, i) => ({ ...m, label: shortMonth(i, lang) })) ?? []
  const totalEvents = d?.eventDistribution.reduce((a, b) => a + b.count, 0) ?? 0

  return (
    <>
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle', { name: hotel?.name ?? '' })}
        actions={<Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28" aria-label={t('dashboard.year')}>{[2026, 2025].map((y) => <option key={y} value={y}>{y}</option>)}</Select>} />
      <QueryBoundary queries={[q]}>
        {d && (
          <div className="space-y-5">
            {/* Operational highlights first: what needs attention today */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={CalendarCheck} tone="blue" label={t('dashboard.todayEvents')} value={num(d.todayBookings)} hint={t('dashboard.todayHint')} />
              <StatCard icon={CalendarHeart} tone="pink" label={t('dashboard.upcomingGuests')} value={num(d.upcomingGuests)} hint={t('dashboard.upcomingGuestsHint', { count: d.upcoming.length })} />
              <StatCard icon={Clock} tone="amber" label={t('dashboard.pendingPayments')} value={money(d.pendingPayments)} hint={t('dashboard.pendingPaymentsHint')} />
              <StatCard icon={Package} tone="purple" label={t('dashboard.stockValue')} value={money(d.stockValue)} hint={t('dashboard.lowCount', { count: d.lowStock.length })} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
              <StatCard icon={TrendingUp} tone="green" label={t('dashboard.dailyNet')} value={money(d.dailyNetProfit)} hint={t('dashboard.dailyNetHint')} />
              <StatCard icon={Wallet} tone="blue" label={t('dashboard.monthIncome')} value={money(d.monthIncome)} hint={t('dashboard.cashHint')} />
              <StatCard icon={Banknote} tone="teal" label={t('dashboard.yearIncome')} value={money(d.yearIncome)} hint={t('dashboard.cashHint')} />
              <StatCard icon={Receipt} tone="red" label={t('dashboard.monthExpenses')} value={money(d.monthExpenses)} />
              <StatCard icon={Coins} tone="amber" label={t('dashboard.yearExpenses')} value={money(d.yearExpenses)} />
              <StatCard icon={PartyPopper} tone="purple" label={t('dashboard.monthWeddings')} value={num(d.monthWeddings)} />
              <StatCard icon={CalendarClock} tone="pink" label={t('dashboard.yearWeddings')} value={num(d.yearWeddings)} />
              <StatCard icon={HandCoins} tone="amber" label={t('dashboard.loanGiven')} value={money(d.totalLoanGiven)} hint={t('dashboard.outstanding')} />
              <StatCard icon={PiggyBank} tone="red" label={t('dashboard.borrowed')} value={money(d.totalBorrowed)} hint={t('dashboard.outstanding')} />
              <StatCard icon={Users} tone="amber" label={t('dashboard.employees')} value={num(d.totalEmployees)} />
              <StatCard icon={Wallet} tone="green" label={t('dashboard.salaryPaid')} value={money(d.salaryPaidThisMonth)} />
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <SectionCard title={t('dashboard.incomeVsExpenses')} subtitle={t('dashboard.incomeVsExpensesHint', { year })}>
                <div dir="ltr" className="h-64"><ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e8f1" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v: number) => compact(v)} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip formatter={(v) => money(Number(v))} />
                    <Legend />
                    <Bar dataKey="income" name={t('dashboard.income')} fill="#2f6cf6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expenses" name={t('dashboard.expenses')} fill="#f4577a" radius={[3, 3, 0, 0]} />
                  </BarChart></ResponsiveContainer></div>
              </SectionCard>
              <SectionCard title={t('dashboard.weddingsTrend')} subtitle={t('dashboard.weddingsTrendHint')}>
                <div dir="ltr" className="h-64"><ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e8f1" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="l" allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                    <YAxis yAxisId="r" orientation="right" tickFormatter={(v: number) => compact(v)} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip formatter={(v, n) => (n === t('dashboard.income') ? money(Number(v)) : num(Number(v)))} />
                    <Legend />
                    <Bar yAxisId="l" dataKey="weddings" name={t('dashboard.weddings')} fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                    <Line yAxisId="r" type="monotone" dataKey="income" name={t('dashboard.income')} stroke="#2f6cf6" strokeWidth={2.5} dot={false} />
                  </ComposedChart></ResponsiveContainer></div>
              </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              <SectionCard title={t('dashboard.recentBookings')} action={<Link to="/hotel/bookings" className="text-sm text-brand-600">{t('common.viewAll')}</Link>} className="xl:col-span-2">
                {d.recentBookings.length === 0 ? <EmptyState title={t('bookings.empty')} /> : (
                  <TableShell><thead><tr><th className="th">{t('bookings.client')}</th><th className="th">{t('bookings.eventDate')}</th><th className="th">{t('bookings.eventType')}</th><th className="th">{t('bookings.guests')}</th><th className="th">{t('bookings.total')}</th><th className="th">{t('common.status')}</th></tr></thead>
                    <tbody>{d.recentBookings.map((b) => (
                      <tr key={b.id} className="border-t border-line"><td className="td font-medium"><Link to={`/hotel/bookings/${b.id}`} className="hover:text-brand-600">{b.clientName}</Link></td><td className="td">{date(b.eventDate)}</td><td className="td">{t(`eventTypes.${b.eventType}`)}</td><td className="td">{num(b.guestCount)}</td><td className="td">{money(calcBookingTotals(b).estimatedTotal)}</td><td className="td"><StatusBadge status={b.status} /></td></tr>
                    ))}</tbody></TableShell>)}
              </SectionCard>
              <SectionCard title={t('dashboard.lowStock')} action={<Link to="/hotel/inventory" className="text-sm text-brand-600">{t('common.viewAll')}</Link>}>
                {d.lowStock.length === 0 ? <EmptyState title={t('inventory.noLow')} icon={AlertTriangle} /> : (
                  <ul className="divide-y divide-line">{d.lowStock.map((i) => (
                    <li key={i.id} className="flex items-center justify-between py-2.5 text-sm"><div><p className="font-medium">{i.name}</p><p className="text-xs text-muted">{num(i.quantity, 1)} / {num(i.minQuantity)} {i.unit}</p></div><StatusBadge status={i.quantity <= 0 ? 'out' : 'low'} /></li>
                  ))}</ul>)}
              </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              <SectionCard title={t('dashboard.upcoming')} className="xl:col-span-1">
                {d.upcoming.length === 0 ? <EmptyState title={t('dashboard.noUpcoming')} /> : (
                  <ul className="divide-y divide-line">{d.upcoming.map((b) => (
                    <li key={b.id} className="flex items-center gap-3 py-2.5">
                      <span className="grid w-12 shrink-0 place-items-center rounded-lg bg-brand-50 py-1 text-brand-700"><span className="text-base font-bold leading-none">{b.eventDate.slice(8)}</span><span className="text-[10px] uppercase">{shortMonth(Number(b.eventDate.slice(5, 7)) - 1, lang)}</span></span>
                      <div className="min-w-0 flex-1"><Link to={`/hotel/bookings/${b.id}`} className="block truncate text-sm font-medium hover:text-brand-600">{b.clientName}</Link><p className="text-xs text-muted">{t(`eventTypes.${b.eventType}`)} · {t(`shift.${b.shift}`)}</p></div>
                      <span className="text-sm text-muted">{num(b.guestCount)}</span>
                    </li>))}</ul>)}
              </SectionCard>
              <SectionCard title={t('dashboard.eventDistribution')} subtitle={t('dashboard.thisYear')}>
                <div className="flex items-center gap-4">
                  <div dir="ltr" className="relative h-40 w-40 shrink-0">
                    <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={d.eventDistribution} dataKey="count" nameKey="type" innerRadius={48} outerRadius={72} paddingAngle={2}>{d.eventDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie></PieChart></ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-xl font-bold">{num(totalEvents)}</p><p className="text-[10px] text-muted">{t('dashboard.totalEvents')}</p></div></div>
                  </div>
                  <ul className="flex-1 space-y-1.5 text-sm">{d.eventDistribution.map((e, i) => <li key={e.type} className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{t(`eventTypes.${e.type}`)}</span><span className="text-muted">{pct(totalEvents ? (e.count / totalEvents) * 100 : 0)}</span></li>)}</ul>
                </div>
              </SectionCard>
              <SectionCard title={t('dashboard.quickActions')}>
                <div className="grid grid-cols-2 gap-3">
                  <LinkButton to="/hotel/bookings/new" className="h-20 flex-col"><Plus className="size-5" />{t('bookings.add')}</LinkButton>
                  <LinkButton to="/hotel/inventory/new" className="h-20 flex-col bg-amber-500 hover:bg-amber-600"><Package className="size-5" />{t('inventory.addItem')}</LinkButton>
                  <LinkButton to="/hotel/employees/new" className="h-20 flex-col bg-violet-600 hover:bg-violet-700"><UserPlus className="size-5" />{t('employees.add')}</LinkButton>
                  <LinkButton to="/hotel/expenses/new" className="h-20 flex-col bg-orange-500 hover:bg-orange-600"><Receipt className="size-5" />{t('expenses.add')}</LinkButton>
                </div>
              </SectionCard>
            </div>
          </div>
        )}
      </QueryBoundary>
    </>
  )
}
