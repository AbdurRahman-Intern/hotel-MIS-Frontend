import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ArrowLeft, CalendarDays, Pencil, Plus, Receipt, Trash2, TrendingUp, Zap } from 'lucide-react'
import { expenseService } from '@/services/resources.service'
import { useAuth } from '@/stores/auth.store'
import { useFormat } from '@/hooks/useFormat'
import { useExpenses, useInvalidate } from '@/hooks/queries'
import { sum } from '@/lib/domain'
import { Badge, Button, Card, ConfirmDialog, DirIcon, EmptyState, Field, IconButton, Input, LinkButton, PageHeader, Pagination, QueryBoundary, SearchInput, Select, StatCard, TableShell, Textarea, usePagination } from '@/components/ui'
import type { Expense } from '@/types'
import { Link } from 'react-router-dom'

export const EXPENSE_CATEGORIES = ['Utilities', 'Fuel', 'Gas', 'Office Supplies', 'Maintenance', 'Internet', 'Transport', 'Rent', 'Miscellaneous'] as const
const tone: Record<string, 'amber' | 'red' | 'blue' | 'purple' | 'green' | 'teal' | 'gray'> = { Utilities: 'amber', Fuel: 'red', Gas: 'red', 'Office Supplies': 'blue', Maintenance: 'purple', Internet: 'green', Transport: 'red', Rent: 'amber', Miscellaneous: 'gray' }

export function ExpensesPage() {
  const { t } = useTranslation(); const { money, date } = useFormat(); const invalidate = useInvalidate()
  const q = useExpenses()
  const [search, setSearch] = useState(''); const [cat, setCat] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState('')
  const [del, setDel] = useState<Expense | null>(null)
  const all = q.data ?? []
  const rows = all.filter((e) => `${e.description} ${e.reference} ${e.paidBy}`.toLowerCase().includes(search.trim().toLowerCase()) && (!cat || e.category === cat) && (!from || e.date >= from) && (!to || e.date <= to)).sort((a, b) => b.date.localeCompare(a.date))
  const p = usePagination(rows, 10, [search, cat, from, to].join('|'))
  const ym = new Date().toISOString().slice(0, 7); const yr = ym.slice(0, 4)
  const month = sum(all.filter((e) => e.date.startsWith(ym)).map((e) => e.amount)); const year = sum(all.filter((e) => e.date.startsWith(yr)).map((e) => e.amount))
  const byCat = new Map<string, number>(); all.filter((e) => e.date.startsWith(yr)).forEach((e) => byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount))
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0]
  const delM = useMutation({ mutationFn: (id: string) => expenseService.deleteExpense(id), onSuccess: async () => { await invalidate('expenses'); toast.success(t('expenses.deleted')); setDel(null) } })
  return (
    <>
      <PageHeader title={t('expenses.title')} subtitle={t('expenses.subtitle')} actions={<LinkButton to="/hotel/expenses/new"><Plus className="size-4" />{t('expenses.add')}</LinkButton>} />
      <QueryBoundary queries={[q]}>
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Receipt} tone="red" label={t('expenses.thisMonth')} value={money(month)} />
          <StatCard icon={CalendarDays} tone="blue" label={t('expenses.thisYear')} value={money(year)} />
          <StatCard icon={Zap} tone="green" label={t('expenses.mostCommon')} value={top ? t(`expCat.${top[0]}`) : '-'} hint={top ? money(top[1]) : undefined} />
          <StatCard icon={TrendingUp} tone="purple" label={t('expenses.avgMonthly')} value={money(year / Math.max(1, Number(ym.slice(5))))} />
        </div>
        <Card>
          <div className="flex flex-wrap gap-3 border-b border-line p-4">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" aria-label={t('common.from')} /><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" aria-label={t('common.to')} />
            <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-44" aria-label={t('expenses.category')}><option value="">{t('expenses.allCategories')}</option>{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{t(`expCat.${c}`)}</option>)}</Select>
            <SearchInput value={search} onChange={setSearch} placeholder={t('expenses.search')} className="min-w-52 flex-1" />
          </div>
          {rows.length === 0 ? <EmptyState title={t('expenses.empty')} description={t('common.tryAdjusting')} action={<LinkButton to="/hotel/expenses/new"><Plus className="size-4" />{t('expenses.add')}</LinkButton>} /> : <>
            <TableShell>
              <thead><tr><th className="th">{t('common.date')}</th><th className="th">{t('expenses.category')}</th><th className="th">{t('common.description')}</th><th className="th">{t('common.amount')}</th><th className="th">{t('expenses.method')}</th><th className="th">{t('expenses.paidBy')}</th><th className="th">{t('common.actions')}</th></tr></thead>
              <tbody>{p.slice.map((e) => <tr key={e.id} className="border-t border-line hover:bg-slate-50"><td className="td whitespace-nowrap">{date(e.date)}</td><td className="td"><Badge tone={tone[e.category]}>{t(`expCat.${e.category}`)}</Badge></td><td className="td">{e.description}</td><td className="td font-medium">{money(e.amount)}</td><td className="td">{t(`method.${e.paymentMethod}`)}</td><td className="td">{e.paidBy}</td>
                <td className="td"><div className="flex gap-0.5"><Link to={`/hotel/expenses/${e.id}/edit`} aria-label={t('common.edit')} title={t('common.edit')} className="rounded-md p-1.5 text-brand-600 hover:bg-slate-100"><Pencil className="size-4" /></Link><IconButton label={t('common.delete')} className="text-red-500" onClick={() => setDel(e)}><Trash2 className="size-4" /></IconButton></div></td></tr>)}</tbody>
            </TableShell><Pagination p={p} /></>}
        </Card>
        <p className="mt-3 text-xs text-muted">{t('expenses.note')}</p>
      </QueryBoundary>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} loading={delM.isPending} title={t('common.delete')} message={t('expenses.deleteConfirm')} confirmLabel={t('common.delete')} onConfirm={() => del && delM.mutate(del.id)} />
    </>
  )
}

const schema = z.object({
  date: z.string().min(1, 'validation.required'), category: z.enum(EXPENSE_CATEGORIES), description: z.string().trim().min(2, 'validation.required'),
  amount: z.number('validation.number').gt(0, 'validation.positive'), paymentMethod: z.enum(['Cash', 'Bank']), paidBy: z.string(), reference: z.string(), notes: z.string(),
})
type Values = z.infer<typeof schema>

export function ExpenseForm() {
  const { id } = useParams(); const editing = !!id
  const { t } = useTranslation(); const navigate = useNavigate(); const invalidate = useInvalidate()
  const tenantId = useAuth((s) => s.user?.tenantId); const user = useAuth((s) => s.user)
  const existing = useQuery({ queryKey: ['expense', tenantId, id], queryFn: () => expenseService.getExpense(id!), enabled: editing && !!tenantId })
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { date: new Date().toISOString().slice(0, 10), category: 'Utilities', description: '', amount: 0, paymentMethod: 'Cash', paidBy: user?.name ?? '', reference: '', notes: '' } })
  const [loaded, setLoaded] = useState(false)
  if (existing.data && !loaded) { setLoaded(true); reset(existing.data) }
  const m = useMutation({ mutationFn: (v: Values) => (editing ? expenseService.updateExpense(id!, v) : expenseService.createExpense(v)), onSuccess: async () => { await invalidate('expenses'); toast.success(t(editing ? 'expenses.updated' : 'expenses.created')); navigate('/hotel/expenses') } })
  const title = t(editing ? 'expenses.edit' : 'expenses.add')
  return (
    <>
      <PageHeader title={title} subtitle={t('expenses.formSubtitle')} breadcrumbs={[{ label: t('nav.expenses'), to: '/hotel/expenses' }, { label: title }]} actions={<Button variant="secondary" onClick={() => navigate(-1)}><DirIcon icon={ArrowLeft} className="size-4" />{t('common.back')}</Button>} />
      <QueryBoundary queries={editing ? [existing] : []}>
        <form onSubmit={handleSubmit((v) => m.mutate(v))} noValidate className="grid max-w-4xl gap-5 md:grid-cols-2">
          <Card className="space-y-3.5 p-5"><h3 className="font-semibold">{t('expenses.info')}</h3>
            <Field label={t('expenses.date')} required error={errors.date?.message}><Input type="date" {...register('date')} /></Field>
            <Field label={t('expenses.category')} required><Select {...register('category')}>{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{t(`expCat.${c}`)}</option>)}</Select></Field>
            <Field label={t('common.description')} required error={errors.description?.message}><Textarea rows={2} {...register('description')} /></Field>
            <Field label={t('common.amount')} required error={errors.amount?.message}><Input type="number" step="any" {...register('amount', { valueAsNumber: true })} /></Field>
          </Card>
          <Card className="space-y-3.5 p-5"><h3 className="font-semibold">{t('expenses.payment')}</h3>
            <Field label={t('expenses.method')} required><Select {...register('paymentMethod')}><option value="Cash">{t('method.Cash')}</option><option value="Bank">{t('method.Bank')}</option></Select></Field>
            <Field label={t('expenses.reference')}><Input dir="ltr" {...register('reference')} /></Field>
            <Field label={t('expenses.paidBy')}><Input {...register('paidBy')} /></Field>
            <Field label={t('common.notes')}><Textarea rows={2} {...register('notes')} /></Field>
          </Card>
          <div className="flex justify-end gap-2 md:col-span-2"><Button variant="secondary" onClick={() => navigate(-1)}>{t('common.cancel')}</Button><Button type="submit" loading={m.isPending}>{t('expenses.save')}</Button></div>
        </form>
      </QueryBoundary>
    </>
  )
}
