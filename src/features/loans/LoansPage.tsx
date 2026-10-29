import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ArrowDownLeft, ArrowUpRight, Coins, HandCoins, Plus, Trash2 } from 'lucide-react'
import { loanService } from '@/services/resources.service'
import { useFormat } from '@/hooks/useFormat'
import { useInvalidate, useLoans } from '@/hooks/queries'
import { calcLoan, sum } from '@/lib/domain'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, IconButton, Input, Modal, PageHeader, Pagination, QueryBoundary, Select, StatCard, StatusBadge, TableShell, Textarea, usePagination } from '@/components/ui'
import type { Loan } from '@/types'

const schema = z.object({ type: z.enum(['borrowed', 'lent']), party: z.string().trim().min(2, 'validation.required'), amount: z.number('validation.number').gt(0, 'validation.positive'), issueDate: z.string().min(1, 'validation.required'), dueDate: z.string().min(1, 'validation.required'), notes: z.string() })
  .refine((v) => v.dueDate >= v.issueDate, { path: ['dueDate'], message: 'validation.dueAfterIssue' })
type Values = z.infer<typeof schema>

export function LoansPage() {
  const { t } = useTranslation(); const { money, date } = useFormat(); const invalidate = useInvalidate()
  const q = useLoans()
  const [type, setType] = useState(''); const [st, setSt] = useState('')
  const [adding, setAdding] = useState(false); const [repay, setRepay] = useState<Loan | null>(null); const [amt, setAmt] = useState(''); const [del, setDel] = useState<Loan | null>(null)
  const all = q.data ?? []
  const calc = all.map((l) => ({ l, c: calcLoan(l) }))
  const rows = calc.filter(({ l, c }) => (!type || l.type === type) && (!st || c.status === st)).sort((a, b) => b.l.issueDate.localeCompare(a.l.issueDate))
  const p = usePagination(rows, 10, type + st)
  const borrowed = sum(calc.filter((x) => x.l.type === 'borrowed').map((x) => x.c.outstanding)); const lent = sum(calc.filter((x) => x.l.type === 'lent').map((x) => x.c.outstanding))
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { type: 'borrowed', party: '', amount: 0, issueDate: new Date().toISOString().slice(0, 10), dueDate: '', notes: '' } })
  const addM = useMutation({ mutationFn: (v: Values) => loanService.createLoan({ ...v, repayments: [] }), onSuccess: async () => { await invalidate('loans'); toast.success(t('loans.created')); setAdding(false); reset() } })
  const repayM = useMutation({
    mutationFn: () => loanService.updateLoan(repay!.id, { repayments: [...repay!.repayments, { date: new Date().toISOString().slice(0, 10), amount: Number(amt) }] }),
    onSuccess: async () => { await invalidate('loans'); toast.success(t('loans.repaid')); setRepay(null); setAmt('') },
  })
  const delM = useMutation({ mutationFn: (id: string) => loanService.deleteLoan(id), onSuccess: async () => { await invalidate('loans'); toast.success(t('loans.deleted')); setDel(null) } })
  const outstandingOfRepay = repay ? calcLoan(repay).outstanding : 0
  const repayValid = Number(amt) > 0 && Number(amt) <= outstandingOfRepay
  return (
    <>
      <PageHeader title={t('loans.title')} subtitle={t('loans.subtitle')} actions={<Button onClick={() => setAdding(true)}><Plus className="size-4" />{t('loans.add')}</Button>} />
      <QueryBoundary queries={[q]}>
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <StatCard icon={ArrowDownLeft} tone="red" label={t('loans.totalBorrowed')} value={money(borrowed)} hint={t('loans.weOwe')} />
          <StatCard icon={ArrowUpRight} tone="green" label={t('loans.totalLent')} value={money(lent)} hint={t('loans.owedToUs')} />
          <StatCard icon={Coins} tone="blue" label={t('loans.net')} value={money(lent - borrowed)} hint={t('loans.netHint')} />
        </div>
        <Card>
          <div className="flex flex-wrap gap-3 border-b border-line p-4">
            <Select value={type} onChange={(e) => setType(e.target.value)} className="w-44" aria-label={t('loans.type')}><option value="">{t('loans.allTypes')}</option><option value="borrowed">{t('status.borrowed')}</option><option value="lent">{t('status.lent')}</option></Select>
            <Select value={st} onChange={(e) => setSt(e.target.value)} className="w-44" aria-label={t('common.status')}><option value="">{t('common.allStatuses')}</option>{['open', 'partial', 'settled'].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}</Select>
          </div>
          {rows.length === 0 ? <EmptyState icon={HandCoins} title={t('loans.empty')} /> : <>
            <TableShell>
              <thead><tr><th className="th">{t('loans.type')}</th><th className="th">{t('loans.party')}</th><th className="th">{t('common.amount')}</th><th className="th">{t('loans.issued')}</th><th className="th">{t('loans.due')}</th><th className="th">{t('loans.repaidAmt')}</th><th className="th">{t('loans.outstanding')}</th><th className="th">{t('common.status')}</th><th className="th">{t('common.actions')}</th></tr></thead>
              <tbody>{p.slice.map(({ l, c }) => <tr key={l.id} className="border-t border-line hover:bg-slate-50"><td className="td"><Badge tone={l.type === 'borrowed' ? 'amber' : 'blue'}>{t(`status.${l.type}`)}</Badge></td><td className="td font-medium">{l.party}</td><td className="td">{money(l.amount)}</td><td className="td whitespace-nowrap">{date(l.issueDate)}</td><td className={`td whitespace-nowrap ${c.outstanding > 0 && l.dueDate < new Date().toISOString().slice(0, 10) ? 'text-red-600' : ''}`}>{date(l.dueDate)}</td><td className="td">{money(c.repaid)}</td><td className="td font-semibold">{money(c.outstanding)}</td><td className="td"><StatusBadge status={c.status} /></td>
                <td className="td"><div className="flex items-center gap-1">{c.outstanding > 0 && <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => setRepay(l)}>{t('loans.recordRepayment')}</Button>}<IconButton label={t('common.delete')} className="text-red-500" onClick={() => setDel(l)}><Trash2 className="size-4" /></IconButton></div></td></tr>)}</tbody>
            </TableShell><Pagination p={p} /></>}
        </Card>
      </QueryBoundary>
      <Modal open={adding} onClose={() => setAdding(false)} title={t('loans.add')} footer={<><Button variant="secondary" onClick={() => setAdding(false)}>{t('common.cancel')}</Button><Button loading={addM.isPending} onClick={() => void handleSubmit((v) => addM.mutate(v))()}>{t('common.save')}</Button></>}>
        <div className="space-y-3.5">
          <Field label={t('loans.type')} required><Select {...register('type')}><option value="borrowed">{t('loans.borrowedFull')}</option><option value="lent">{t('loans.lentFull')}</option></Select></Field>
          <Field label={t('loans.party')} required error={errors.party?.message}><Input {...register('party')} /></Field>
          <Field label={t('common.amount')} required error={errors.amount?.message}><Input type="number" step="any" {...register('amount', { valueAsNumber: true })} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label={t('loans.issued')} required error={errors.issueDate?.message}><Input type="date" {...register('issueDate')} /></Field><Field label={t('loans.due')} required error={errors.dueDate?.message}><Input type="date" {...register('dueDate')} /></Field></div>
          <Field label={t('common.notes')}><Textarea rows={2} {...register('notes')} /></Field>
        </div>
      </Modal>
      <Modal open={!!repay} onClose={() => setRepay(null)} title={t('loans.recordRepayment')} footer={<><Button variant="secondary" onClick={() => setRepay(null)}>{t('common.cancel')}</Button><Button disabled={!repayValid} loading={repayM.isPending} onClick={() => repayM.mutate()}>{t('common.save')}</Button></>}>
        <p className="mb-3 text-sm text-muted">{repay?.party} · {t('loans.outstanding')}: {money(outstandingOfRepay)}</p>
        <Field label={t('common.amount')} error={amt && !repayValid ? 'validation.repayRange' : undefined}><Input type="number" min={0} value={amt} onChange={(e) => setAmt(e.target.value)} autoFocus /></Field>
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} loading={delM.isPending} title={t('common.delete')} message={t('loans.deleteConfirm')} confirmLabel={t('common.delete')} onConfirm={() => del && delM.mutate(del.id)} />
    </>
  )
}
