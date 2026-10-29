import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ArrowLeft, Eye, Pencil, Plus, Trash2, UserCheck, UserMinus, Users, Plane } from 'lucide-react'
import { employeeService } from '@/services/resources.service'
import { useAuth } from '@/stores/auth.store'
import { useFormat } from '@/hooks/useFormat'
import { useEmployees, useInvalidate, useSalaries } from '@/hooks/queries'
import { Button, Card, ConfirmDialog, DirIcon, EmptyState, Field, IconButton, Input, LinkButton, PageHeader, Pagination, QueryBoundary, SearchInput, SectionCard, Select, StatCard, StatusBadge, TableShell, Textarea, usePagination } from '@/components/ui'
import { calcSalary } from '@/lib/domain'
import type { Employee } from '@/types'

const POSITIONS = ['Chef', 'Cook', 'Waiter', 'Driver', 'Reception', 'Cleaner', 'Security', 'Accountant', 'Gardener', 'Manager']
const DEPARTMENTS = ['Kitchen', 'Service', 'Logistics', 'Front Office', 'Housekeeping', 'Maintenance', 'Finance']

function Avatar({ name }: { name: string }) {
  return <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-800 text-xs font-bold text-white">{name.slice(0, 1)}</span>
}

export function EmployeesPage() {
  const { t } = useTranslation(); const { money, num } = useFormat(); const invalidate = useInvalidate()
  const q = useEmployees()
  const [search, setSearch] = useState(''); const [pos, setPos] = useState(''); const [st, setSt] = useState(''); const [sc, setSc] = useState('')
  const [del, setDel] = useState<Employee | null>(null)
  const all = q.data ?? []
  const rows = all.filter((e) => `${e.fullName} ${e.position} ${e.phone}`.toLowerCase().includes(search.trim().toLowerCase()) && (!pos || e.position === pos) && (!st || e.status === st) && (!sc || (sc === 'eligible') === e.serviceChargeEligible))
  const p = usePagination(rows, 10, [search, pos, st, sc].join('|'))
  const delM = useMutation({ mutationFn: (id: string) => employeeService.deleteEmployee(id), onSuccess: async () => { await invalidate('employees', 'salaries'); toast.success(t('employees.deleted')); setDel(null) } })
  return (
    <>
      <PageHeader title={t('employees.title')} subtitle={t('employees.subtitle')} actions={<LinkButton to="/hotel/employees/new"><Plus className="size-4" />{t('employees.add')}</LinkButton>} />
      <QueryBoundary queries={[q]}>
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} tone="green" label={t('employees.total')} value={num(all.length)} />
          <StatCard icon={UserCheck} tone="blue" label={t('employees.activeCount')} value={num(all.filter((e) => e.status === 'active').length)} />
          <StatCard icon={Plane} tone="amber" label={t('employees.onLeave')} value={num(all.filter((e) => e.status === 'on_leave').length)} />
          <StatCard icon={UserMinus} tone="red" label={t('employees.inactive')} value={num(all.filter((e) => e.status === 'inactive').length)} />
        </div>
        <Card>
          <div className="flex flex-wrap gap-3 border-b border-line p-4">
            <SearchInput value={search} onChange={setSearch} placeholder={t('employees.search')} className="min-w-52 flex-1" />
            <Select value={pos} onChange={(e) => setPos(e.target.value)} className="w-40" aria-label={t('employees.position')}><option value="">{t('employees.allPositions')}</option>{POSITIONS.map((x) => <option key={x} value={x}>{t(`positions.${x}`)}</option>)}</Select>
            <Select value={st} onChange={(e) => setSt(e.target.value)} className="w-40" aria-label={t('common.status')}><option value="">{t('common.allStatuses')}</option>{['active', 'on_leave', 'inactive'].map((x) => <option key={x} value={x}>{t(`status.${x}`)}</option>)}</Select>
            <Select value={sc} onChange={(e) => setSc(e.target.value)} className="w-44" aria-label={t('employees.serviceCharge')}><option value="">{t('employees.serviceCharge')}</option><option value="eligible">{t('status.eligible')}</option><option value="not_eligible">{t('status.not_eligible')}</option></Select>
          </div>
          {rows.length === 0 ? <EmptyState title={t('employees.empty')} description={t('common.tryAdjusting')} action={<LinkButton to="/hotel/employees/new"><Plus className="size-4" />{t('employees.add')}</LinkButton>} /> : <>
            <TableShell>
              <thead><tr><th className="th">{t('employees.name')}</th><th className="th">{t('employees.position')}</th><th className="th">{t('common.phone')}</th><th className="th">{t('employees.salary')}</th><th className="th">{t('employees.serviceCharge')}</th><th className="th">{t('common.status')}</th><th className="th">{t('common.actions')}</th></tr></thead>
              <tbody>{p.slice.map((e) => (
                <tr key={e.id} className="border-t border-line hover:bg-slate-50">
                  <td className="td"><div className="flex items-center gap-3"><Avatar name={e.fullName} /><Link to={`/hotel/employees/${e.id}`} className="font-medium hover:text-brand-600">{e.fullName}</Link></div></td>
                  <td className="td">{t(`positions.${e.position}`, { defaultValue: e.position })}</td><td className="td"><span className="ltr-isolate">{e.phone}</span></td><td className="td">{money(e.salary)}</td>
                  <td className="td"><StatusBadge status={e.serviceChargeEligible ? 'eligible' : 'not_eligible'} /></td><td className="td"><StatusBadge status={e.status} /></td>
                  <td className="td"><div className="flex gap-0.5">
                    <Link to={`/hotel/employees/${e.id}`} aria-label={t('common.view')} title={t('common.view')} className="rounded-md p-1.5 text-brand-600 hover:bg-slate-100"><Eye className="size-4" /></Link>
                    <Link to={`/hotel/employees/${e.id}/edit`} aria-label={t('common.edit')} title={t('common.edit')} className="rounded-md p-1.5 text-brand-600 hover:bg-slate-100"><Pencil className="size-4" /></Link>
                    <IconButton label={t('common.delete')} className="text-red-500" onClick={() => setDel(e)}><Trash2 className="size-4" /></IconButton></div></td>
                </tr>))}</tbody>
            </TableShell><Pagination p={p} /></>}
        </Card>
      </QueryBoundary>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} loading={delM.isPending} title={t('common.delete')} message={t('employees.deleteConfirm', { name: del?.fullName ?? '' })} confirmLabel={t('common.delete')} onConfirm={() => del && delM.mutate(del.id)} />
    </>
  )
}

const schema = z.object({
  fullName: z.string().trim().min(2, 'validation.required'),
  phone: z.string().trim().min(7, 'validation.phone'),
  gender: z.enum(['Male', 'Female']),
  position: z.string().min(1, 'validation.required'),
  department: z.string(),
  employeeType: z.enum(['Full Time', 'Part Time', 'Contract']),
  salary: z.number('validation.number').min(0, 'validation.nonNegative'),
  joinDate: z.string().min(1, 'validation.required'),
  status: z.enum(['active', 'on_leave', 'inactive']),
  serviceChargeEligible: z.boolean(),
  address: z.string(), idNumber: z.string(), emergencyContact: z.string(), notes: z.string(),
})
type Values = z.infer<typeof schema>

export function EmployeeForm() {
  const { id } = useParams(); const editing = !!id
  const { t } = useTranslation(); const navigate = useNavigate(); const invalidate = useInvalidate()
  const tenantId = useAuth((s) => s.user?.tenantId)
  const existing = useQuery({ queryKey: ['employee', tenantId, id], queryFn: () => employeeService.getEmployee(id!), enabled: editing && !!tenantId })
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { fullName: '', phone: '', gender: 'Male', position: '', department: '', employeeType: 'Full Time', salary: 0, joinDate: new Date().toISOString().slice(0, 10), status: 'active', serviceChargeEligible: true, address: '', idNumber: '', emergencyContact: '', notes: '' } })
  const [loaded, setLoaded] = useState(false)
  if (existing.data && !loaded) { setLoaded(true); reset(existing.data) }
  const m = useMutation({
    mutationFn: (v: Values) => (editing ? employeeService.updateEmployee(id!, v) : employeeService.createEmployee(v)),
    onSuccess: async () => { await invalidate('employees'); toast.success(t(editing ? 'employees.updated' : 'employees.created')); navigate('/hotel/employees') },
  })
  const title = t(editing ? 'employees.edit' : 'employees.add')
  return (
    <>
      <PageHeader title={title} subtitle={t('employees.formSubtitle')} breadcrumbs={[{ label: t('nav.employees'), to: '/hotel/employees' }, { label: title }]} actions={<Button variant="secondary" onClick={() => navigate(-1)}><DirIcon icon={ArrowLeft} className="size-4" />{t('common.back')}</Button>} />
      <QueryBoundary queries={editing ? [existing] : []}>
        <form onSubmit={handleSubmit((v) => m.mutate(v))} noValidate className="grid max-w-4xl gap-5">
          <SectionCard title={t('employees.personal')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('employees.fullName')} required error={errors.fullName?.message}><Input {...register('fullName')} /></Field>
              <Field label={t('employees.gender')} required><Select {...register('gender')}><option value="Male">{t('gender.Male')}</option><option value="Female">{t('gender.Female')}</option></Select></Field>
              <Field label={t('common.phone')} required error={errors.phone?.message}><Input dir="ltr" placeholder="+93 700 000 000" {...register('phone')} /></Field>
              <Field label={t('employees.hireDate')} required error={errors.joinDate?.message}><Input type="date" {...register('joinDate')} /></Field>
              <div className="sm:col-span-2"><Field label={t('common.address')}><Textarea rows={2} {...register('address')} /></Field></div>
            </div>
          </SectionCard>
          <SectionCard title={t('employees.job')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('employees.position')} required error={errors.position?.message}><Select {...register('position')}><option value="">{t('common.select')}</option>{POSITIONS.map((x) => <option key={x} value={x}>{t(`positions.${x}`)}</option>)}</Select></Field>
              <Field label={t('employees.salary')} required error={errors.salary?.message}><Input type="number" step="any" {...register('salary', { valueAsNumber: true })} /></Field>
              <Field label={t('employees.department')}><Select {...register('department')}><option value="">{t('common.select')}</option>{DEPARTMENTS.map((x) => <option key={x} value={x}>{t(`departments.${x}`)}</option>)}</Select></Field>
              <Field label={t('employees.type')}><Select {...register('employeeType')}>{['Full Time', 'Part Time', 'Contract'].map((x) => <option key={x} value={x}>{t(`employeeTypes.${x}`)}</option>)}</Select></Field>
              <Field label={t('common.status')} required><Select {...register('status')}>{['active', 'on_leave', 'inactive'].map((x) => <option key={x} value={x}>{t(`status.${x}`)}</option>)}</Select></Field>
              <label className="flex items-start gap-3 rounded-lg border border-line p-3 text-sm"><input type="checkbox" className="mt-1" {...register('serviceChargeEligible')} /><span><span className="block font-medium">{t('employees.scEligible')}</span><span className="block text-xs text-muted">{t('employees.scHint')}</span></span></label>
            </div>
          </SectionCard>
          <SectionCard title={t('employees.additional')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('employees.idNumber')}><Input dir="ltr" {...register('idNumber')} /></Field>
              <Field label={t('employees.emergency')}><Input dir="ltr" {...register('emergencyContact')} /></Field>
              <div className="sm:col-span-2"><Field label={t('common.notes')}><Textarea {...register('notes')} /></Field></div>
            </div>
          </SectionCard>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => navigate(-1)}>{t('common.cancel')}</Button><Button type="submit" loading={m.isPending}>{t('employees.save')}</Button></div>
        </form>
      </QueryBoundary>
    </>
  )
}

export function EmployeeDetailPage() {
  const { id = '' } = useParams(); const { t } = useTranslation(); const { money, date, month } = useFormat()
  const tenantId = useAuth((s) => s.user?.tenantId)
  const q = useQuery({ queryKey: ['employee', tenantId, id], queryFn: () => employeeService.getEmployee(id), enabled: !!tenantId })
  const sal = useSalaries()
  const e = q.data
  const history = (sal.data ?? []).filter((s) => s.employeeId === id).sort((a, b) => b.month.localeCompare(a.month))
  return (
    <>
      <PageHeader title={e?.fullName ?? '…'} breadcrumbs={[{ label: t('nav.employees'), to: '/hotel/employees' }, { label: e?.fullName ?? '…' }]} actions={e && <LinkButton to={`/hotel/employees/${e.id}/edit`} variant="secondary"><Pencil className="size-4" />{t('common.edit')}</LinkButton>} />
      <QueryBoundary queries={[q, sal]}>
        {e && <div className="grid gap-5 lg:grid-cols-3">
          <SectionCard title={t('employees.details')} className="lg:col-span-2">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {([['employees.position', t(`positions.${e.position}`, { defaultValue: e.position })], ['employees.department', e.department ? t(`departments.${e.department}`, { defaultValue: e.department }) : '-'], ['common.phone', <span className="ltr-isolate">{e.phone}</span>], ['employees.salary', money(e.salary)], ['employees.hireDate', date(e.joinDate)], ['employees.type', t(`employeeTypes.${e.employeeType}`)], ['common.status', <StatusBadge status={e.status} />], ['employees.serviceCharge', <StatusBadge status={e.serviceChargeEligible ? 'eligible' : 'not_eligible'} />], ['employees.idNumber', <span className="ltr-isolate">{e.idNumber || '-'}</span>], ['employees.emergency', <span className="ltr-isolate">{e.emergencyContact || '-'}</span>], ['common.address', e.address || '-']] as [string, React.ReactNode][]).map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{t(k)}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>)}
            </dl>
          </SectionCard>
          <SectionCard title={t('employees.salaryHistory')}>
            {history.length === 0 ? <p className="text-sm text-muted">{t('salaries.empty')}</p> : <ul className="divide-y divide-line">{history.map((s) => <li key={s.id} className="flex items-center justify-between py-2 text-sm"><span>{month(s.month)}</span><span className="flex items-center gap-2">{money(calcSalary(s).net)}<StatusBadge status={s.status} /></span></li>)}</ul>}
          </SectionCard>
        </div>}
      </QueryBoundary>
    </>
  )
}
