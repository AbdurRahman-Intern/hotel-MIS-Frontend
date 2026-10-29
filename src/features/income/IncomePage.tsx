import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Banknote, CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react'
import { incomeService } from '@/services/resources.service'
import { useAuth } from '@/stores/auth.store'
import { useFormat } from '@/hooks/useFormat'
import { useIncome, useInvalidate } from '@/hooks/queries'
import { sum } from '@/lib/domain'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, IconButton, Input, Modal, PageHeader, Pagination, QueryBoundary, Select, StatCard, TableShell, Textarea, usePagination } from '@/components/ui'
import type { ExternalIncome } from '@/types'

const SOURCES = ['Parking', 'Recycling', 'Other'] as const
const schema = z.object({ date: z.string().min(1, 'validation.required'), source: z.enum(SOURCES), description: z.string().trim().min(2, 'validation.required'), amount: z.number('validation.number').gt(0, 'validation.positive'), receivedBy: z.string(), notes: z.string() })
type Values = z.infer<typeof schema>

export function IncomePage() {
  const { t } = useTranslation(); const { money, date } = useFormat(); const invalidate = useInvalidate()
  const user = useAuth((s) => s.user)
  const q = useIncome()
  const [src, setSrc] = useState(''); const [editing, setEditing] = useState<ExternalIncome | 'new' | null>(null); const [del, setDel] = useState<ExternalIncome | null>(null)
  const all = q.data ?? []
  const rows = all.filter((x) => !src || x.source === src).sort((a, b) => b.date.localeCompare(a.date))
  const p = usePagination(rows, 10, src)
  const ym = new Date().toISOString().slice(0, 7)
  const blank: Values = { date: new Date().toISOString().slice(0, 10), source: 'Parking', description: '', amount: 0, receivedBy: user?.name ?? '', notes: '' }
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: blank })
  const open = (x: ExternalIncome | 'new') => { reset(x === 'new' ? blank : x); setEditing(x) }
  const m = useMutation({
    mutationFn: (v: Values) => (editing && editing !== 'new' ? incomeService.updateIncome(editing.id, v) : incomeService.createIncome(v)),
    onSuccess: async () => { await invalidate('income'); toast.success(t(editing === 'new' ? 'income.created' : 'income.updated')); setEditing(null) },
  })
  const delM = useMutation({ mutationFn: (id: string) => incomeService.deleteIncome(id), onSuccess: async () => { await invalidate('income'); toast.success(t('income.deleted')); setDel(null) } })
  return (
    <>
      <PageHeader title={t('income.title')} subtitle={t('income.subtitle')} actions={<Button onClick={() => open('new')}><Plus className="size-4" />{t('income.add')}</Button>} />
      <QueryBoundary queries={[q]}>
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <StatCard icon={Banknote} tone="green" label={t('income.thisMonth')} value={money(sum(all.filter((x) => x.date.startsWith(ym)).map((x) => x.amount)))} />
          <StatCard icon={CalendarDays} tone="blue" label={t('income.thisYear')} value={money(sum(all.filter((x) => x.date.startsWith(ym.slice(0, 4))).map((x) => x.amount)))} />
          {SOURCES.slice(0, 1).map(() => <StatCard key="p" icon={Banknote} tone="amber" label={t('income.total')} value={money(sum(all.map((x) => x.amount)))} hint={t('income.notBookings')} />)}
        </div>
        <Card>
          <div className="border-b border-line p-4"><Select value={src} onChange={(e) => setSrc(e.target.value)} className="w-48" aria-label={t('income.source')}><option value="">{t('income.allSources')}</option>{SOURCES.map((s) => <option key={s} value={s}>{t(`incomeSource.${s}`)}</option>)}</Select></div>
          {rows.length === 0 ? <EmptyState title={t('income.empty')} action={<Button onClick={() => open('new')}><Plus className="size-4" />{t('income.add')}</Button>} /> : <>
            <TableShell>
              <thead><tr><th className="th">{t('common.date')}</th><th className="th">{t('income.source')}</th><th className="th">{t('common.description')}</th><th className="th">{t('common.amount')}</th><th className="th">{t('income.receivedBy')}</th><th className="th">{t('common.actions')}</th></tr></thead>
              <tbody>{p.slice.map((x) => <tr key={x.id} className="border-t border-line hover:bg-slate-50"><td className="td whitespace-nowrap">{date(x.date)}</td><td className="td"><Badge tone={x.source === 'Parking' ? 'blue' : x.source === 'Recycling' ? 'green' : 'gray'}>{t(`incomeSource.${x.source}`)}</Badge></td><td className="td">{x.description}</td><td className="td font-medium">{money(x.amount)}</td><td className="td">{x.receivedBy}</td>
                <td className="td"><div className="flex gap-0.5"><IconButton label={t('common.edit')} className="text-brand-600" onClick={() => open(x)}><Pencil className="size-4" /></IconButton><IconButton label={t('common.delete')} className="text-red-500" onClick={() => setDel(x)}><Trash2 className="size-4" /></IconButton></div></td></tr>)}</tbody>
            </TableShell><Pagination p={p} /></>}
        </Card>
      </QueryBoundary>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={t(editing === 'new' ? 'income.add' : 'income.edit')} footer={<><Button variant="secondary" onClick={() => setEditing(null)}>{t('common.cancel')}</Button><Button loading={m.isPending} onClick={() => void handleSubmit((v) => m.mutate(v))()}>{t('common.save')}</Button></>}>
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3"><Field label={t('common.date')} required error={errors.date?.message}><Input type="date" {...register('date')} /></Field><Field label={t('income.source')} required><Select {...register('source')}>{SOURCES.map((s) => <option key={s} value={s}>{t(`incomeSource.${s}`)}</option>)}</Select></Field></div>
          <Field label={t('common.description')} required error={errors.description?.message}><Input {...register('description')} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label={t('common.amount')} required error={errors.amount?.message}><Input type="number" step="any" {...register('amount', { valueAsNumber: true })} /></Field><Field label={t('income.receivedBy')}><Input {...register('receivedBy')} /></Field></div>
          <Field label={t('common.notes')}><Textarea rows={2} {...register('notes')} /></Field>
        </div>
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} loading={delM.isPending} title={t('common.delete')} message={t('income.deleteConfirm')} confirmLabel={t('common.delete')} onConfirm={() => del && delM.mutate(del.id)} />
    </>
  )
}
