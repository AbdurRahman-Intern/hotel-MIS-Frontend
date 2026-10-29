import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { addMonths, format, parseISO } from 'date-fns'
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Trash2, Users, Wallet, Layers } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { salaryService } from '@/services/resources.service'
import { AppError } from '@/lib/axios'
import { useEmployees, useInvalidate, useSalaries } from '@/hooks/queries'
import { useFormat } from '@/hooks/useFormat'
import { calcSalary, sum } from '@/lib/domain'
import { Button, Card, ConfirmDialog, DirIcon, EmptyState, Field, IconButton, Input, PageHeader, Pagination, QueryBoundary, SearchInput, SectionCard, Select, StatCard, StatusBadge, TableShell, Textarea, usePagination } from '@/components/ui'
import type { SalaryPayment } from '@/types'

const schema = z.object({
  employeeId: z.string().min(1, 'validation.required'),
  basicSalary: z.number('validation.number').min(0, 'validation.nonNegative'),
  serviceCharge: z.number('validation.number').min(0, 'validation.nonNegative'),
  advanceDeduction: z.number('validation.number').min(0, 'validation.nonNegative'),
  otherDeduction: z.number('validation.number').min(0, 'validation.nonNegative'),
  notes: z.string(),
})
type Values = z.infer<typeof schema>

export function SalariesPage() {
  const { t } = useTranslation(); const { money, num, date, month: fmtMonth } = useFormat(); const invalidate = useInvalidate()
  const emps = useEmployees(); const sal = useSalaries()
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [dept, setDept] = useState(''); const [st, setSt] = useState(''); const [search, setSearch] = useState('')
  const [del, setDel] = useState<SalaryPayment | null>(null)
  const employees = (emps.data ?? [])
  const active = employees.filter((e) => e.status !== 'inactive')
  const empOf = (id: string) => employees.find((e) => e.id === id)
  const monthRows = (sal.data ?? []).filter((s) => s.month === month)

  const rows = monthRows.filter((s) => {
    const e = empOf(s.employeeId)
    return (!dept || e?.department === dept) && (!st || s.status === st) && `${e?.fullName} ${e?.position}`.toLowerCase().includes(search.trim().toLowerCase())
  })
  const p = usePagination(rows, 10, [month, dept, st, search].join('|'))

  const paid = monthRows.filter((s) => s.status === 'paid')
  const totals = {
    net: sum(monthRows.map((s) => calcSalary(s).net)), basic: sum(monthRows.map((s) => s.basicSalary)), sc: sum(monthRows.map((s) => s.serviceCharge)),
    ded: sum(monthRows.map((s) => calcSalary(s).deductions)), paidNet: sum(paid.map((s) => calcSalary(s).net)),
  }
  const pendingCount = Math.max(0, active.length - paid.length)
  const chart = [{ name: t('status.paid'), value: paid.length, color: '#10b981' }, { name: t('status.pending'), value: pendingCount, color: '#f59e0b' }]

  const markPaid = useMutation({ mutationFn: (id: string) => salaryService.updatePayment(id, { status: 'paid', paidDate: new Date().toISOString().slice(0, 10) }), onSuccess: async () => { await invalidate('salaries'); toast.success(t('salaries.markedPaid')) } })
  const delM = useMutation({ mutationFn: (id: string) => salaryService.deletePayment(id), onSuccess: async () => { await invalidate('salaries'); toast.success(t('salaries.deleted')); setDel(null) } })

  // --- add form ---
  const { register, handleSubmit, setValue, reset, control, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { employeeId: '', basicSalary: 0, serviceCharge: 0, advanceDeduction: 0, otherDeduction: 0, notes: '' } })
  const w = useWatch({ control })
  const safe = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : 0)
  const calc = calcSalary({ basicSalary: safe(w.basicSalary), serviceCharge: safe(w.serviceCharge), advanceDeduction: safe(w.advanceDeduction), otherDeduction: safe(w.otherDeduction) })
  const picked = empOf(w.employeeId ?? '')
  const addM = useMutation({
    mutationFn: async (v: Values) => {
      if (monthRows.some((s) => s.employeeId === v.employeeId)) throw new AppError('validation', 'exists')
      return salaryService.createPayment({ ...v, month, paidDate: new Date().toISOString().slice(0, 10), status: 'paid' })
    },
    onSuccess: async () => { await invalidate('salaries'); toast.success(t('salaries.saved')); reset() },
    onError: (e) => { if (e instanceof AppError && e.message === 'exists') setError('employeeId', { message: 'validation.salaryExists' }); else toast.error(t('errors.generic')) },
  })

  return (
    <>
      <PageHeader title={t('salaries.title')} subtitle={t('salaries.subtitle')} />
      <QueryBoundary queries={[emps, sal]}>
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Wallet} tone="green" label={t('salaries.totalMonth')} value={money(totals.net)} hint={fmtMonth(month)} />
          <StatCard icon={Users} tone="blue" label={t('salaries.employeesPaid')} value={`${num(paid.length)} / ${num(active.length)}`} hint={t('salaries.ofEmployees', { pct: active.length ? Math.round((paid.length / active.length) * 100) : 0 })} />
          <StatCard icon={Clock} tone="amber" label={t('salaries.pendingPayments')} value={num(pendingCount)} hint={t('salaries.notPaidYet')} />
          <StatCard icon={Layers} tone="purple" label={t('salaries.serviceCharges')} value={money(totals.sc)} hint={t('salaries.eligibleOnly')} />
        </div>
        <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
          <Card>
            <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
              <div className="flex items-center gap-1 rounded-lg border border-line bg-white">
                <IconButton label={t('common.previous')} onClick={() => setMonth(format(addMonths(parseISO(`${month}-01`), -1), 'yyyy-MM'))}><DirIcon icon={ChevronLeft} className="size-4" /></IconButton>
                <span className="min-w-32 text-center text-sm font-medium">{fmtMonth(month)}</span>
                <IconButton label={t('common.next')} onClick={() => setMonth(format(addMonths(parseISO(`${month}-01`), 1), 'yyyy-MM'))}><DirIcon icon={ChevronRight} className="size-4" /></IconButton>
              </div>
              <Select value={dept} onChange={(e) => setDept(e.target.value)} className="w-40" aria-label={t('employees.department')}><option value="">{t('salaries.allDepartments')}</option>{[...new Set(employees.map((e) => e.department).filter(Boolean))].map((d) => <option key={d} value={d}>{t(`departments.${d}`, { defaultValue: d })}</option>)}</Select>
              <Select value={st} onChange={(e) => setSt(e.target.value)} className="w-36" aria-label={t('common.status')}><option value="">{t('common.allStatuses')}</option><option value="paid">{t('status.paid')}</option><option value="pending">{t('status.pending')}</option></Select>
              <SearchInput value={search} onChange={setSearch} placeholder={t('salaries.search')} className="min-w-44 flex-1" />
            </div>
            {rows.length === 0 ? <EmptyState title={t('salaries.empty')} description={t('salaries.emptyHint')} /> : <>
              <TableShell>
                <thead><tr><th className="th">{t('salaries.employee')}</th><th className="th">{t('employees.position')}</th><th className="th">{t('salaries.basic')}</th><th className="th">{t('salaries.serviceCharge')}</th><th className="th">{t('salaries.deductions')}</th><th className="th">{t('salaries.net')}</th><th className="th">{t('salaries.paidDate')}</th><th className="th">{t('common.status')}</th><th className="th">{t('common.actions')}</th></tr></thead>
                <tbody>{p.slice.map((s) => {
                  const e = empOf(s.employeeId); const c = calcSalary(s)
                  return <tr key={s.id} className="border-t border-line hover:bg-slate-50"><td className="td font-medium">{e?.fullName ?? '-'}</td><td className="td">{e ? t(`positions.${e.position}`, { defaultValue: e.position }) : '-'}</td><td className="td">{money(s.basicSalary)}</td><td className="td">{money(s.serviceCharge)}</td><td className="td">{money(c.deductions)}</td><td className="td font-semibold">{money(c.net)}</td><td className="td whitespace-nowrap">{date(s.paidDate)}</td><td className="td"><StatusBadge status={s.status} /></td>
                    <td className="td"><div className="flex items-center gap-1">{s.status === 'pending' && <Button variant="success" className="px-2 py-1 text-xs" loading={markPaid.isPending && markPaid.variables === s.id} onClick={() => markPaid.mutate(s.id)}><CheckCircle2 className="size-3.5" />{t('salaries.markPaid')}</Button>}<IconButton label={t('common.delete')} className="text-red-500" onClick={() => setDel(s)}><Trash2 className="size-4" /></IconButton></div></td></tr>
                })}</tbody>
              </TableShell><Pagination p={p} /></>}
          </Card>

          <SectionCard title={t('salaries.addPayment')} className="h-fit xl:sticky xl:top-20">
            <form onSubmit={handleSubmit((v) => addM.mutate(v))} noValidate className="space-y-3.5">
              <Field label={t('salaries.employee')} required error={errors.employeeId?.message}>
                <Select {...register('employeeId', { onChange: (e) => { const emp = empOf(e.target.value); if (emp) { setValue('basicSalary', emp.salary); setValue('serviceCharge', 0) } } })}><option value="">{t('common.select')}</option>{active.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}</Select>
              </Field>
              <p className="rounded-lg bg-slate-50 p-2.5 text-xs text-muted">{picked ? `${t(`positions.${picked.position}`, { defaultValue: picked.position })} · ${picked.serviceChargeEligible ? t('status.eligible') : t('status.not_eligible')} · ${fmtMonth(month)}` : fmtMonth(month)}</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('salaries.basic')} required error={errors.basicSalary?.message}><Input type="number" step="any" {...register('basicSalary', { valueAsNumber: true })} /></Field>
                <Field label={t('salaries.serviceCharge')} error={errors.serviceCharge?.message}><Input type="number" step="any" disabled={picked ? !picked.serviceChargeEligible : false} {...register('serviceCharge', { valueAsNumber: true })} /></Field>
                <Field label={t('salaries.advanceDeduction')} error={errors.advanceDeduction?.message}><Input type="number" step="any" {...register('advanceDeduction', { valueAsNumber: true })} /></Field>
                <Field label={t('salaries.otherDeduction')} error={errors.otherDeduction?.message}><Input type="number" step="any" {...register('otherDeduction', { valueAsNumber: true })} /></Field>
              </div>
              <Field label={t('common.notes')}><Textarea rows={2} {...register('notes')} /></Field>
              <dl className="space-y-1 rounded-lg bg-brand-50 p-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted">{t('salaries.basic')}</dt><dd>{money(safe(w.basicSalary))}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">{t('salaries.serviceCharge')}</dt><dd>{money(safe(w.serviceCharge))}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">{t('salaries.deductions')}</dt><dd>{money(calc.deductions)}</dd></div>
                <div className="flex justify-between border-t border-brand-100 pt-1 font-bold"><dt>{t('salaries.netPayment')}</dt><dd>{money(calc.net)}</dd></div>
              </dl>
              <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => reset()}>{t('common.cancel')}</Button><Button type="submit" loading={addM.isPending}>{t('salaries.savePayment')}</Button></div>
            </form>
          </SectionCard>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_22rem]">
          <SectionCard title={t('salaries.monthlySummary', { month: fmtMonth(month) })}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={Wallet} tone="green" label={t('salaries.totalBasic')} value={money(totals.basic)} />
              <StatCard icon={Layers} tone="blue" label={t('salaries.totalSC')} value={money(totals.sc)} />
              <StatCard icon={Trash2} tone="red" label={t('salaries.totalDeductions')} value={money(totals.ded)} />
              <StatCard icon={CheckCircle2} tone="purple" label={t('salaries.totalPaidOut')} value={money(totals.paidNet)} hint={t('salaries.paidOnlyNote')} />
            </div>
          </SectionCard>
          <SectionCard title={t('salaries.statusBreakdown')}>
            <div className="flex items-center gap-4">
              <div dir="ltr" className="relative h-32 w-32 shrink-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chart} dataKey="value" innerRadius={38} outerRadius={58} paddingAngle={2}>{chart.map((c) => <Cell key={c.name} fill={c.color} />)}</Pie></PieChart></ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-lg font-bold">{num(active.length)}</p><p className="text-[10px] text-muted">{t('nav.employees')}</p></div></div></div>
              <ul className="flex-1 space-y-1.5 text-sm">{chart.map((c) => <li key={c.name} className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: c.color }} />{c.name}</span><span className="font-medium">{num(c.value)}</span></li>)}</ul>
            </div>
          </SectionCard>
        </div>
      </QueryBoundary>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} loading={delM.isPending} title={t('common.delete')} message={t('salaries.deleteConfirm')} confirmLabel={t('common.delete')} onConfirm={() => del && delM.mutate(del.id)} />
    </>
  )
}
