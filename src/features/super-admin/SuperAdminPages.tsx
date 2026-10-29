import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Building2, CheckCircle2, PauseCircle, Pencil, Plus, Power, Users } from 'lucide-react'
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { hotelService, type NewHotelInput } from '@/services/hotels.service'
import { AppError } from '@/lib/axios'
import { useFormat } from '@/hooks/useFormat'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, LinkButton, PageHeader, Pagination, QueryBoundary, SearchInput, SectionCard, Select, StatCard, StatusBadge, TableShell, Textarea, usePagination } from '@/components/ui'
import { formatMonth } from '@/lib/formatters'
import type { Hotel, HotelStatus, PlanId } from '@/types'

const PIE = ['#1f5bf0', '#0f9d8a', '#d4af37', '#8b5cf6']

// ---------------- Dashboard ----------------
export function SuperAdminDashboard() {
  const { t } = useTranslation()
  const { lang, date, num } = useFormat()
  const q = useQuery({ queryKey: ['platform-stats'], queryFn: hotelService.getPlatformStats })
  const s = q.data
  return (
    <>
      <PageHeader title={t('superAdmin.dashboardTitle')} subtitle={t('superAdmin.dashboardSubtitle')} actions={<LinkButton to="/super-admin/hotels/new"><Plus className="size-4" />{t('hotels.register')}</LinkButton>} />
      <QueryBoundary queries={[q]}>
        {s && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={Building2} tone="blue" label={t('superAdmin.totalHotels')} value={num(s.totalHotels)} />
              <StatCard icon={CheckCircle2} tone="green" label={t('superAdmin.activeHotels')} value={num(s.activeHotels)} />
              <StatCard icon={PauseCircle} tone="red" label={t('superAdmin.suspendedHotels')} value={num(s.suspendedHotels)} />
              <StatCard icon={Users} tone="purple" label={t('superAdmin.totalUsers')} value={num(s.totalUsers)} />
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              <SectionCard title={t('superAdmin.growth')} subtitle={t('superAdmin.growthHint')} className="lg:col-span-2">
                <div dir="ltr" className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={s.growth.map((g) => ({ ...g, label: formatMonth(g.month, lang).split(' ')[0] }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e8f1" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip />
                      <Line type="monotone" dataKey="hotels" stroke="#0f9d8a" strokeWidth={2.5} dot={{ r: 3 }} name={t('superAdmin.totalHotels')} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
              <SectionCard title={t('superAdmin.planDistribution')}>
                <div dir="ltr" className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={s.planDistribution} dataKey="count" nameKey="plan" innerRadius={42} outerRadius={70} paddingAngle={2}>{s.planDistribution.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}</Pie><Tooltip /></PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {s.planDistribution.map((p, i) => <li key={p.plan} className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: PIE[i % PIE.length] }} />{p.plan}</span><span className="font-medium">{num(p.count)}</span></li>)}
                </ul>
              </SectionCard>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <SectionCard title={t('superAdmin.recentHotels')} action={<Link to="/super-admin/hotels" className="text-sm text-brand-600">{t('common.viewAll')}</Link>}>
                <ul className="divide-y divide-line">
                  {s.recentHotels.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0"><Link to={`/super-admin/hotels/${h.id}`} className="font-medium hover:text-brand-600">{h.name}</Link><p className="text-xs text-muted">{h.ownerName} · {date(h.registeredAt)}</p></div>
                      <StatusBadge status={h.status} />
                    </li>
                  ))}
                </ul>
              </SectionCard>
              <SectionCard title={t('superAdmin.activity')}>
                <ul className="space-y-3">
                  {s.activity.map((a) => <li key={a.id} className="flex gap-3 text-sm"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent-500" /><div><p>{a.message}</p><p className="text-xs text-muted">{date(a.date.slice(0, 10))}</p></div></li>)}
                </ul>
              </SectionCard>
            </div>
          </div>
        )}
      </QueryBoundary>
    </>
  )
}

// ---------------- Hotels list ----------------
export function HotelsPage() {
  const { t } = useTranslation()
  const { date } = useFormat()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const q = useQuery({ queryKey: ['hotels'], queryFn: hotelService.getHotels })
  const plans = useQuery({ queryKey: ['plans'], queryFn: hotelService.getPlans })
  const rows = (q.data ?? []).filter((h) => (!status || h.status === status) && h.name.toLowerCase().includes(search.trim().toLowerCase()))
  const p = usePagination(rows, 10, search + status)
  const planName = (id: PlanId) => plans.data?.find((x) => x.id === id)?.name ?? id
  return (
    <>
      <PageHeader title={t('hotels.title')} subtitle={t('hotels.subtitle')} actions={<LinkButton to="/super-admin/hotels/new"><Plus className="size-4" />{t('hotels.register')}</LinkButton>} />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <SearchInput value={search} onChange={setSearch} placeholder={t('hotels.search')} className="min-w-56 flex-1" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44" aria-label={t('common.status')}>
            <option value="">{t('common.allStatuses')}</option><option value="active">{t('status.active')}</option><option value="suspended">{t('status.suspended')}</option>
          </Select>
        </div>
        <QueryBoundary queries={[q]}>
          {rows.length === 0 ? <EmptyState title={t('hotels.empty')} description={t('common.tryAdjusting')} /> : (
            <>
              <TableShell>
                <thead><tr><th className="th">{t('hotels.name')}</th><th className="th">{t('hotels.owner')}</th><th className="th">{t('common.phone')}</th><th className="th">{t('hotels.plan')}</th><th className="th">{t('hotels.joined')}</th><th className="th">{t('common.status')}</th></tr></thead>
                <tbody>
                  {p.slice.map((h) => (
                    <tr key={h.id} className="border-t border-line hover:bg-slate-50">
                      <td className="td"><Link to={`/super-admin/hotels/${h.id}`} className="flex items-center gap-3 font-medium hover:text-brand-600"><span className="grid size-9 place-items-center rounded-lg bg-navy-900 text-xs font-bold text-gold">{h.name.slice(0, 1)}</span><span>{h.name}<span className="block text-xs font-normal text-muted ltr-isolate">{h.slug}</span></span></Link></td>
                      <td className="td">{h.ownerName}<span className="block text-xs text-muted ltr-isolate">{h.ownerEmail}</span></td>
                      <td className="td"><span className="ltr-isolate">{h.phone}</span></td>
                      <td className="td"><Badge tone="purple">{planName(h.planId)}</Badge></td>
                      <td className="td">{date(h.registeredAt)}</td>
                      <td className="td"><StatusBadge status={h.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
              <Pagination p={p} />
            </>
          )}
        </QueryBoundary>
      </Card>
    </>
  )
}

// ---------------- Hotel form (create + edit) ----------------
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const hotelSchema = z.object({
  name: z.string().min(2, 'validation.required'),
  slug: z.string().min(2, 'validation.required').regex(/^[a-z0-9-]+$/, 'validation.slug'),
  ownerName: z.string().min(2, 'validation.required'),
  ownerEmail: z.string().min(1, 'validation.required').email('validation.email'),
  phone: z.string().min(5, 'validation.required'),
  address: z.string().min(2, 'validation.required'),
  planId: z.enum(['starter', 'professional', 'enterprise']),
  currency: z.enum(['AFN', 'USD']),
})
type HotelValues = z.infer<typeof hotelSchema>

function HotelForm({ initial, hotelId }: { initial?: Hotel; hotelId?: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const plans = useQuery({ queryKey: ['plans'], queryFn: hotelService.getPlans })
  const { register, handleSubmit, setValue, setError, formState: { errors, dirtyFields } } = useForm<HotelValues>({
    resolver: zodResolver(hotelSchema),
    defaultValues: initial ? { name: initial.name, slug: initial.slug, ownerName: initial.ownerName, ownerEmail: initial.ownerEmail, phone: initial.phone, address: initial.address, planId: initial.planId, currency: initial.currency as 'AFN' | 'USD' } : { name: '', slug: '', ownerName: '', ownerEmail: '', phone: '', address: '', planId: 'starter', currency: 'AFN' },
  })
  const m = useMutation({
    mutationFn: (v: HotelValues) => (hotelId ? hotelService.updateHotel(hotelId, v) : hotelService.createHotel(v as NewHotelInput)),
    onSuccess: (h) => { void qc.invalidateQueries({ queryKey: ['hotels'] }); void qc.invalidateQueries({ queryKey: ['platform-stats'] }); void qc.invalidateQueries({ queryKey: ['hotel', h.id] }); toast.success(t(hotelId ? 'hotels.updated' : 'hotels.created')); navigate(`/super-admin/hotels/${h.id}`) },
    onError: (e) => {
      if (e instanceof AppError && e.message === 'slug_taken') setError('slug', { message: 'validation.slugTaken' })
      else if (e instanceof AppError && e.message === 'email_taken') setError('ownerEmail', { message: 'validation.emailTaken' })
      else toast.error(t('errors.generic'))
    },
  })
  return (
    <form onSubmit={handleSubmit((v) => m.mutate(v))} className="card grid max-w-3xl gap-4 p-5 sm:grid-cols-2" noValidate>
      <Field label={t('hotels.name')} required error={errors.name?.message}>
        <Input {...register('name', { onChange: (e) => { if (!hotelId && !dirtyFields.slug) setValue('slug', slugify(e.target.value)) } })} />
      </Field>
      <Field label={t('hotels.slug')} required error={errors.slug?.message} hint={t('hotels.slugHint')}><Input dir="ltr" {...register('slug')} /></Field>
      <Field label={t('hotels.ownerName')} required error={errors.ownerName?.message}><Input {...register('ownerName')} /></Field>
      <Field label={t('hotels.ownerEmail')} required error={errors.ownerEmail?.message}><Input dir="ltr" type="email" {...register('ownerEmail')} disabled={!!hotelId} /></Field>
      <Field label={t('common.phone')} required error={errors.phone?.message}><Input dir="ltr" {...register('phone')} /></Field>
      <Field label={t('hotels.plan')} required><Select {...register('planId')}>{(plans.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
      <Field label={t('settings.currency')} required><Select {...register('currency')}><option value="AFN">AFN</option><option value="USD">USD</option></Select></Field>
      <div className="sm:col-span-2"><Field label={t('common.address')} required error={errors.address?.message}><Textarea {...register('address')} /></Field></div>
      {!hotelId && <p className="sm:col-span-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{t('hotels.ownerAccountNote')}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>{t('common.cancel')}</Button>
        <Button type="submit" loading={m.isPending}>{t('common.save')}</Button>
      </div>
    </form>
  )
}

export function NewHotelPage() {
  const { t } = useTranslation()
  return (<><PageHeader title={t('hotels.register')} breadcrumbs={[{ label: t('nav.hotels'), to: '/super-admin/hotels' }, { label: t('hotels.register') }]} /><HotelForm /></>)
}

// ---------------- Hotel detail ----------------
export function HotelDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const { date } = useFormat()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState<HotelStatus | null>(null)
  const q = useQuery({ queryKey: ['hotel', id], queryFn: () => hotelService.getHotel(id) })
  const plans = useQuery({ queryKey: ['plans'], queryFn: hotelService.getPlans })
  const h = q.data
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['hotel', id] }); void qc.invalidateQueries({ queryKey: ['hotels'] }); void qc.invalidateQueries({ queryKey: ['platform-stats'] }) }
  const statusM = useMutation({ mutationFn: (s: HotelStatus) => hotelService.setStatus(id, s), onSuccess: () => { refresh(); setConfirm(null); toast.success(t('hotels.statusUpdated')) } })
  const planM = useMutation({ mutationFn: (p: PlanId) => hotelService.updateHotel(id, { planId: p }), onSuccess: () => { refresh(); toast.success(t('hotels.planUpdated')) } })
  return (
    <>
      <PageHeader title={h?.name ?? t('common.loading')} breadcrumbs={[{ label: t('nav.hotels'), to: '/super-admin/hotels' }, { label: h?.name ?? '…' }]}
        actions={h && <>
          <Button variant="secondary" onClick={() => setEditing((e) => !e)}><Pencil className="size-4" />{t('common.edit')}</Button>
          <Button variant={h.status === 'active' ? 'danger' : 'success'} onClick={() => setConfirm(h.status === 'active' ? 'suspended' : 'active')}><Power className="size-4" />{h.status === 'active' ? t('hotels.suspend') : t('hotels.activate')}</Button>
        </>} />
      <QueryBoundary queries={[q]}>
        {h && (editing ? <HotelForm initial={h} hotelId={h.id} /> : (
          <div className="grid gap-5 lg:grid-cols-3">
            <SectionCard title={t('hotels.info')} className="lg:col-span-2">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                {([['hotels.slug', <span className="ltr-isolate">{h.slug}</span>], ['common.status', <StatusBadge status={h.status} />], ['common.phone', <span className="ltr-isolate">{h.phone}</span>], ['hotels.joined', date(h.registeredAt)], ['common.address', h.address], ['settings.currency', h.currency]] as [string, React.ReactNode][]).map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-muted">{t(k)}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>
                ))}
              </dl>
            </SectionCard>
            <div className="space-y-5">
              <SectionCard title={t('hotels.ownerInfo')}>
                <p className="font-medium">{h.ownerName}</p><p className="text-sm text-muted ltr-isolate">{h.ownerEmail}</p>
              </SectionCard>
              <SectionCard title={t('hotels.plan')} subtitle={t('hotels.planHint')}>
                <Select value={h.planId} onChange={(e) => planM.mutate(e.target.value as PlanId)} aria-label={t('hotels.plan')}>{(plans.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
              </SectionCard>
            </div>
          </div>
        ))}
      </QueryBoundary>
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} loading={statusM.isPending} title={confirm === 'suspended' ? t('hotels.suspend') : t('hotels.activate')}
        message={confirm === 'suspended' ? t('hotels.suspendConfirm') : t('hotels.activateConfirm')} confirmLabel={t('common.confirm')} tone={confirm === 'suspended' ? 'danger' : 'primary'} onConfirm={() => confirm && statusM.mutate(confirm)} />
    </>
  )
}

// ---------------- Users ----------------
export function UsersPage() {
  const { t } = useTranslation()
  const q = useQuery({ queryKey: ['platform-users'], queryFn: hotelService.getUsers })
  const hotels = useQuery({ queryKey: ['hotels'], queryFn: hotelService.getHotels })
  const [search, setSearch] = useState('')
  const rows = (q.data ?? []).filter((u) => (u.name + u.email).toLowerCase().includes(search.toLowerCase()))
  const p = usePagination(rows, 10, search)
  return (
    <>
      <PageHeader title={t('nav.users')} subtitle={t('users.subtitle')} />
      <Card>
        <div className="border-b border-line p-4"><SearchInput value={search} onChange={setSearch} placeholder={t('common.search')} className="max-w-sm" /></div>
        <QueryBoundary queries={[q, hotels]}>
          {rows.length === 0 ? <EmptyState title={t('common.noResults')} /> : <>
            <TableShell>
              <thead><tr><th className="th">{t('common.name')}</th><th className="th">{t('auth.email')}</th><th className="th">{t('users.role')}</th><th className="th">{t('users.hotel')}</th></tr></thead>
              <tbody>{p.slice.map((u) => (
                <tr key={u.id} className="border-t border-line">
                  <td className="td font-medium">{u.name}</td><td className="td"><span className="ltr-isolate">{u.email}</span></td>
                  <td className="td"><Badge tone={u.role === 'super_admin' ? 'purple' : 'blue'}>{t(`roles.${u.role}`)}</Badge></td>
                  <td className="td">{hotels.data?.find((h) => h.id === u.tenantId)?.name ?? '-'}</td>
                </tr>))}</tbody>
            </TableShell><Pagination p={p} /></>}
        </QueryBoundary>
      </Card>
    </>
  )
}

// ---------------- Plans ----------------
export function PlansPage() {
  const { t } = useTranslation()
  const { money, num } = useFormat()
  const plans = useQuery({ queryKey: ['plans'], queryFn: hotelService.getPlans })
  const hotels = useQuery({ queryKey: ['hotels'], queryFn: hotelService.getHotels })
  return (
    <>
      <PageHeader title={t('nav.plans')} subtitle={t('plans.subtitle')} />
      <QueryBoundary queries={[plans, hotels]}>
        <div className="grid gap-5 md:grid-cols-3">
          {(plans.data ?? []).map((p) => (
            <SectionCard key={p.id} title={p.name}>
              <p className="text-3xl font-bold">{money(p.priceMonthly).replace(/^AFN\s|\sAFN$/, '')}<span className="text-sm font-normal text-muted"> {t('plans.perMonth')}</span></p>
              <p className="mt-3 text-sm text-muted">{t('plans.maxUsers', { count: p.maxUsers })}</p>
              <p className="mt-1 text-sm">{t('plans.hotelsOnPlan', { count: num(hotels.data?.filter((h) => h.planId === p.id).length ?? 0) })}</p>
            </SectionCard>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">{t('plans.note')}</p>
      </QueryBoundary>
    </>
  )
}

// ---------------- Platform settings ----------------
export function PlatformSettingsPage() {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader title={t('nav.settings')} subtitle={t('superAdmin.settingsSubtitle')} />
      <SectionCard title={t('superAdmin.prototypeConfig')}>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted">VITE_API_BASE_URL</dt><dd className="mt-0.5 font-medium ltr-isolate">{import.meta.env.VITE_API_BASE_URL}</dd></div>
          <div><dt className="text-xs text-muted">{t('superAdmin.authMode')}</dt><dd className="mt-0.5 font-medium">{t('superAdmin.authModeValue')}</dd></div>
        </dl>
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{t('superAdmin.securityNote')}</p>
      </SectionCard>
    </>
  )
}
