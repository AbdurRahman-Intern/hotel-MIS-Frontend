import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { useFormat } from '@/hooks/useFormat'
import { shortMonth } from '@/lib/formatters'
import { cn } from '@/lib/cn'
import { SectionCard, Select } from '@/components/ui'
import type { DashboardStatistics } from '@/types'

/**
 * ProfitLossCard  -  the hotel's profit or loss, monthly or yearly.
 *
 *   profit = income (cash from bookings + external income) - expenses - salaries paid - stock purchases
 *   A negative number is a LOSS and is shown in red.
 *
 * The numbers come from the server (`monthly` rows of the dashboard). This component only picks which
 * month or the whole year to show; it does no accounting itself, except adding up the rows for "Yearly".
 */
export function ProfitLossCard({ d, year }: { d: DashboardStatistics; year: number }) {
  const { t } = useTranslation()
  const { money, compact, lang } = useFormat()
  const [mode, setMode] = useState<'month' | 'year'>('month')
  // Default month: the current month when viewing this year, else January.
  const [monthIndex, setMonthIndex] = useState(year === new Date().getFullYear() ? new Date().getMonth() : 0)

  const rows = d.monthly.map((m, i) => ({ ...m, label: shortMonth(i, lang) }))
  const row = rows[monthIndex] ?? rows[0]
  const shown = mode === 'year'
    ? { income: d.yearIncome, expenses: d.yearExpenses, salaries: d.yearSalaries, stock: d.yearStock, profit: d.yearProfit }
    : { income: row.income, expenses: row.expenses, salaries: row.salaries, stock: row.stock, profit: row.profit }
  const loss = shown.profit < 0
  const title = mode === 'year' ? t('profit.forYear', { year }) : t('profit.forMonth', { month: row.label, year })

  const line = (label: string, value: number, sign: '+' | '-') => (
    <div className="flex items-center justify-between py-2 text-sm">
      <dt className="text-muted">{sign === '+' ? '' : '− '}{label}</dt>
      <dd className="font-medium">{money(value)}</dd>
    </div>
  )

  return (
    <SectionCard title={t('profit.title')} subtitle={t('profit.subtitle')}
      action={
        <div className="flex items-center gap-2">
          {mode === 'month' && (
            <Select value={monthIndex} onChange={(e) => setMonthIndex(Number(e.target.value))} className="w-28" aria-label={t('profit.month')}>
              {rows.map((r, i) => <option key={r.month} value={i}>{r.label}</option>)}
            </Select>)}
          <div className="inline-flex rounded-lg border border-line p-0.5 text-sm" role="tablist">
            {(['month', 'year'] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
                className={cn('rounded-md px-3 py-1', mode === k ? 'bg-brand-600 text-white' : 'text-muted hover:bg-slate-100')}>{t(`profit.${k === 'month' ? 'monthly' : 'yearly'}`)}</button>))}
          </div>
        </div>}>
      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        <div>
          <p className="text-xs text-muted">{title}</p>
          <div className={cn('mt-1 flex items-center gap-2 rounded-xl p-3', loss ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')}>
            {loss ? <TrendingDown className="size-7" /> : <TrendingUp className="size-7" />}
            <div><p className="text-xs font-semibold uppercase">{loss ? t('profit.loss') : t('profit.profit')}</p><p data-testid="profit-value" className="text-2xl font-bold">{money(Math.abs(shown.profit))}</p></div>
          </div>
          <dl className="mt-3 divide-y divide-line">
            {line(t('profit.income'), shown.income, '+')}
            {line(t('profit.expenses'), shown.expenses, '-')}
            {line(t('profit.salaries'), shown.salaries, '-')}
            {line(t('profit.stock'), shown.stock, '-')}
          </dl>
          <p className="mt-2 text-xs text-muted">{t('profit.formula')}</p>
        </div>
        <div dir="ltr" className="h-64"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e8f1" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v: number) => compact(v)} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
            <Tooltip formatter={(v) => money(Number(v))} />
            <ReferenceLine y={0} stroke="#94a3b8" />
            <Bar dataKey="profit" name={t('profit.profitLoss')} radius={[3, 3, 0, 0]}>
              {rows.map((r, i) => <Cell key={r.month} fill={r.profit < 0 ? '#ef4444' : '#10b981'} fillOpacity={mode === 'month' && i !== monthIndex ? 0.45 : 1} />)}
            </Bar>
          </BarChart></ResponsiveContainer></div>
      </div>
    </SectionCard>
  )
}
