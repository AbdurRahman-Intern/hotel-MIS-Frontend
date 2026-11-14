import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ArrowLeft, Eye, HandCoins, Layers, Pencil, Percent, Plus, Trash2, Users, Wallet } from 'lucide-react'
import { partnerService } from '@/services/resources.service'
import { useAuth } from '@/stores/auth.store'
import { useFormat } from '@/hooks/useFormat'
import { useInvalidate, usePartners } from '@/hooks/queries'
import { calcPartner, sum } from '@/lib/domain'
import { Badge, Button, Card, ConfirmDialog, DirIcon, EmptyState, Field, IconButton, Input, LinkButton, Modal, PageHeader, Pagination, QueryBoundary, SearchInput, SectionCard, Select, StatCard, StatusBadge, TableShell, Textarea, usePagination } from '@/components/ui'
import type { Partner } from '@/types'

export function PartnersPage() {
  const { t } = useTranslation(); const { money, num, pct } = useFormat(); const invalidate = useInvalidate()
  const q = usePartners()
  const [search, setSearch] = useState(''); const [st, setSt] = useState(''); const [del, setDel] = useState<Partner | null>(null)
  const all = q.data ?? []
  const rows = all.filter((x) => `${x.fullName} ${x.phone}`.toLowerCase().includes(search.trim().toLowerCase()) && (!st || x.status === st))
  const p = usePagination(rows, 10, search + st)
  const calc = all.map(calcPartner)
  const delM = useMutation({ mutationFn: (id: string) => partnerService.deletePartner(id), onSuccess: async () => { await invalidate('partners'); toast.success(t('partners.deleted')); setDel(null) } })
  return (
    <>
      <PageHeader title={t('partners.title')} subtitle={t('partners.subtitle')} actions={<LinkButton to="/hotel/partners/new"><Plus className="size-4" />{t('partners.add')}</LinkButton>} />
      <QueryBoundary queries={[q]}>
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} tone="green" label={t('partners.total')} value={num(all.filter((x) => x.status === 'active').length)} hint={t('partners.activePartners')} />
          <StatCard icon={Layers} tone="blue" label={t('partners.totalInvestment')} value={money(sum(all.map((x) => x.investment)))} />
          <StatCard icon={Percent} tone="amber" label={t('partners.totalProfit')} value={money(sum(calc.map((c) => c.profitShare)))} hint={t('partners.distributed')} />
          <StatCard icon={HandCoins} tone="purple" label={t('partners.totalCashOut')} value={money(sum(calc.map((c) => c.withdrawn)))} hint={t('partners.notExpense')} />
        </div>
        <Card>
          <div className="flex flex-wrap gap-3 border-b border-line p-4">
            <SearchInput value={search} onChange={setSearch} placeholder={t('partners.search')} className="min-w-52 flex-1" />
            <Select value={st} onChange={(e) => setSt(e.target.value)} className="w-40" aria-label={t('common.status')}><option value="">{t('common.allStatuses')}</option><option value="active">{t('status.active')}</option><option value="inactive">{t('status.inactive')}</option></Select>
          </div>
          {rows.length === 0 ? <EmptyState title={t('partners.empty')} action={<LinkButton to="/hotel/partners/new"><Plus className="size-4" />{t('partners.add')}</LinkButton>} /> : <>
            <TableShell>
              <thead><tr><th className="th">{t('common.name')}</th><th className="th">{t('common.phone')}</th><th className="th">{t('partners.investment')}</th><th className="th">{t('partners.share')}</th><th className="th">{t('partners.profitShare')}</th><th className="th">{t('partners.withdrawn')}</th><th className="th">{t('partners.balance')}</th><th className="th">{t('common.status')}</th><th className="th">{t('common.actions')}</th></tr></thead>
              <tbody>{p.slice.map((x) => { const c = calcPartner(x); return (
                <tr key={x.id} className="border-t border-line hover:bg-slate-50"><td className="td font-medium">{x.fullName}</td><td className="td"><span className="ltr-isolate">{x.phone}</span></td><td className="td">{money(x.investment)}</td><td className="td">{pct(x.sharePercent)}</td><td className="td">{money(c.profitShare)}</td><td className="td">{money(c.withdrawn)}</td><td className="td font-semibold">{money(c.balance)}</td><td className="td"><StatusBadge status={x.status} /></td>
                  <td className="td"><div className="flex gap-0.5"><Link to={`/hotel/partners/${x.id}`} aria-label={t('common.view')} title={t('common.view')} className="rounded-md p-1.5 text-brand-600 hover:bg-slate-100"><Eye className="size-4" /></Link><Link to={`/hotel/partners/${x.id}/edit`} aria-label={t('common.edit')} title={t('common.edit')} className="rounded-md p-1.5 text-brand-600 hover:bg-slate-100"><Pencil className="size-4" /></Link><IconButton label={t('common.delete')} className="text-red-500" onClick={() => setDel(x)}><Trash2 className="size-4" /></IconButton></div></td></tr>) })}</tbody>
            </TableShell><Pagination p={p} /></>}
        </Card>
        <p className="mt-3 text-xs text-muted">{t('partners.withdrawalNote')}</p>
      </QueryBoundary>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} loading={delM.isPending} title={t('common.delete')} message={t('partners.deleteConfirm', { name: del?.fullName ?? '' })} confirmLabel={t('common.delete')} onConfirm={() => del && delM.mutate(del.id)} />
    </>
  )
}

const schema = z.object({
  fullName: z.string().trim().min(2, 'validation.required'), phone: z.string().trim().min(7, 'validation.phone'),
  email: z.string().refine((v) => v === '' || /^\S+@\S+\.\S+$/.test(v), 'validation.email'), address: z.string(),
  investment: z.number('validation.number').min(0, 'validation.nonNegative'),
  sharePercent: z.number('validation.number').min(0, 'validation.nonNegative').max(100, 'validation.percentMax'),
  startDate: z.string().min(1, 'validation.required'), status: z.enum(['active', 'inactive']), notes: z.string(),
})
type Values = z.infer<typeof schema>

export function PartnerForm() {
  const { id } = useParams(); const editing = !!id
  const { t } = useTranslation(); const navigate = useNavigate(); const invalidate = useInvalidate()
  const tenantId = useAuth((s) => s.user?.tenantId); const all = usePartners()
  const existing = useQuery({ queryKey: ['partner', tenantId, id], queryFn: () => partnerService.getPartner(id!), enabled: editing && !!tenantId })
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { fullName: '', phone: '', email: '', address: '', investment: 0, sharePercent: 0, startDate: new Date().toISOString().slice(0, 10), status: 'active', notes: '' } })
  const [loaded, setLoaded] = useState(false)
  if (existing.data && !loaded) { setLoaded(true); reset(existing.data) }
  const m = useMutation({
    mutationFn: (v: Values) => {
      const others = sum((all.data ?? []).filter((x) => x.id !== id && x.status === 'active').map((x) => x.sharePercent))
      if (v.status === 'active' && others + v.sharePercent > 100) throw new Error('share_over')
      return editing ? partnerService.updatePartner(id!, v) : partnerService.createPartner({ ...v, transactions: v.investment > 0 ? [{ date: v.startDate, type: 'contribution', amount: v.investment, note: 'Initial investment' }] : [] })
    },
    onSuccess: async () => { await invalidate('partners'); toast.success(t(editing ? 'partners.updated' : 'partners.created')); navigate('/hotel/partners') },
    onError: (e) => { if (e instanceof Error && e.message === 'share_over') setError('sharePercent', { message: 'validation.shareOver' }); else toast.error(t('errors.generic')) },
  })
  const title = t(editing ? 'partners.edit' : 'partners.add')
  return (
    <>
      <PageHeader title={title} subtitle={t('partners.formSubtitle')} breadcrumbs={[{ label: t('nav.partners'), to: '/hotel/partners' }, { label: title }]} actions={<Button variant="secondary" onClick={() => navigate(-1)}><DirIcon icon={ArrowLeft} className="size-4" />{t('common.back')}</Button>} />
      <QueryBoundary queries={editing ? [existing, all] : [all]}>
        <form onSubmit={handleSubmit((v) => m.mutate(v))} noValidate className="grid max-w-4xl gap-5 md:grid-cols-2">
          <SectionCard title={t('partners.info')}><div className="space-y-3.5">
            <Field label={t('partners.fullName')} required error={errors.fullName?.message}><Input {...register('fullName')} /></Field>
            <Field label={t('common.phone')} required error={errors.phone?.message}><Input dir="ltr" {...register('phone')} /></Field>
            <Field label={t('common.email')} error={errors.email?.message}><Input dir="ltr" type="email" {...register('email')} /></Field>
            <Field label={t('common.address')}><Textarea rows={2} {...register('address')} /></Field>
          </div></SectionCard>
          <SectionCard title={t('partners.investmentShare')}><div className="space-y-3.5">
            <Field label={t('partners.investment')} required error={errors.investment?.message} hint={editing ? t('partners.investmentEditHint') : undefined}><Input type="number" step="any" disabled={editing} {...register('investment', { valueAsNumber: true })} /></Field>
            <Field label={t('partners.sharePercent')} required error={errors.sharePercent?.message}><Input type="number" step="any" {...register('sharePercent', { valueAsNumber: true })} /></Field>
            <Field label={t('partners.startDate')} required error={errors.startDate?.message}><Input type="date" {...register('startDate')} /></Field>
            <Field label={t('common.status')} required><Select {...register('status')}><option value="active">{t('status.active')}</option><option value="inactive">{t('status.inactive')}</option></Select></Field>
            <Field label={t('common.notes')}><Textarea rows={2} {...register('notes')} /></Field>
          </div></SectionCard>
          <div className="flex justify-end gap-2 md:col-span-2"><Button variant="secondary" onClick={() => navigate(-1)}>{t('common.cancel')}</Button><Button type="submit" loading={m.isPending}>{t('partners.save')}</Button></div>
        </form>
      </QueryBoundary>
    </>
  )
}

const txSchema = z.object({ type: z.enum(['contribution', 'profit_share', 'withdrawal']), amount: z.number('validation.number').gt(0, 'validation.positive'), date: z.string().min(1, 'validation.required'), note: z.string() })
type TxValues = z.infer<typeof txSchema>

export function PartnerDetailPage() {
  const { id = '' } = useParams(); const { t } = useTranslation(); const { money, date, pct } = useFormat(); const invalidate = useInvalidate()
  const tenantId = useAuth((s) => s.user?.tenantId)
  const q = useQuery({ queryKey: ['partner', tenantId, id], queryFn: () => partnerService.getPartner(id), enabled: !!tenantId })
  const [open, setOpen] = useState(false)
  const x = q.data; const c = x ? calcPartner(x) : null
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TxValues>({ resolver: zodResolver(txSchema), defaultValues: { type: 'withdrawal', amount: 0, date: new Date().toISOString().slice(0, 10), note: '' } })
  const m = useMutation({
    mutationFn: (v: TxValues) => {
      if (v.type === 'withdrawal' && c && v.amount > c.balance) throw new Error('over')
      return partnerService.addTransaction(x!, v)
    },
    onSuccess: async () => { await invalidate('partners'); void q.refetch(); toast.success(t('partners.txSaved')); setOpen(false); reset() },
    onError: (e) => toast.error(e instanceof Error && e.message === 'over' ? t('validation.withdrawOver') : t('errors.generic')),
  })
  return (
    <>
      <PageHeader title={x?.fullName ?? '…'} breadcrumbs={[{ label: t('nav.partners'), to: '/hotel/partners' }, { label: x?.fullName ?? '…' }]} actions={x && <><LinkButton to={`/hotel/partners/${id}/edit`} variant="secondary"><Pencil className="size-4" />{t('common.edit')}</LinkButton><Button onClick={() => setOpen(true)}><Plus className="size-4" />{t('partners.addTx')}</Button></>} />
      <QueryBoundary queries={[q]}>
        {x && c && <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Layers} tone="blue" label={t('partners.investment')} value={money(c.contributed)} hint={`${t('partners.share')}: ${pct(x.sharePercent)}`} />
            <StatCard icon={Percent} tone="green" label={t('partners.profitShare')} value={money(c.profitShare)} />
            <StatCard icon={HandCoins} tone="purple" label={t('partners.withdrawn')} value={money(c.withdrawn)} />
            <StatCard icon={Wallet} tone="amber" label={t('partners.balance')} value={money(c.balance)} hint={t('partners.balanceHint')} />
          </div>
          <SectionCard title={t('partners.account')} subtitle={t('partners.withdrawalNote')}>
            <TableShell><thead><tr><th className="th">{t('common.date')}</th><th className="th">{t('common.type')}</th><th className="th">{t('common.amount')}</th><th className="th">{t('common.notes')}</th></tr></thead>
              <tbody>{[...x.transactions].sort((a, b) => b.date.localeCompare(a.date)).map((tx, i) => <tr key={i} className="border-t border-line"><td className="td">{date(tx.date)}</td><td className="td"><Badge tone={tx.type === 'withdrawal' ? 'amber' : tx.type === 'profit_share' ? 'green' : 'blue'}>{t(`partners.tx.${tx.type}`)}</Badge></td><td className="td">{money(tx.amount)}</td><td className="td text-muted">{tx.note}</td></tr>)}</tbody></TableShell>
          </SectionCard>
        </div>}
      </QueryBoundary>
      <Modal open={open} onClose={() => setOpen(false)} title={t('partners.addTx')} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button loading={m.isPending} onClick={() => void handleSubmit((v) => m.mutate(v))()}>{t('common.save')}</Button></>}>
        <div className="space-y-3.5">
          <Field label={t('common.type')}><Select {...register('type')}>{['contribution', 'profit_share', 'withdrawal'].map((k) => <option key={k} value={k}>{t(`partners.tx.${k}`)}</option>)}</Select></Field>
          <Field label={t('common.amount')} error={errors.amount?.message}><Input type="number" step="any" {...register('amount', { valueAsNumber: true })} /></Field>
          <Field label={t('common.date')} error={errors.date?.message}><Input type="date" {...register('date')} /></Field>
          <Field label={t('common.notes')}><Input {...register('note')} /></Field>
        </div>
      </Modal>
    </>
  )
}
