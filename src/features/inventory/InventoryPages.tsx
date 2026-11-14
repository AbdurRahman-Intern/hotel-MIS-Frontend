import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, useWatch, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AlertOctagon, AlertTriangle, ArrowLeft, Check, Package, Pencil, Plus, Trash2, Wallet, Wheat, Beef, Carrot, Milk, Flame, Droplet, Boxes } from 'lucide-react'
import { inventoryService } from '@/services/inventory.service'
import { AppError } from '@/lib/axios'
import { useAuth } from '@/stores/auth.store'
import { useFormat } from '@/hooks/useFormat'
import { useInvalidate, useItems, useMovements } from '@/hooks/queries'
import { movementTotal, round2, stockStatus, stockValue, sum } from '@/lib/domain'
import { Button, Card, ConfirmDialog, DirIcon, EmptyState, Field, IconButton, Input, LinkButton, Modal, PageHeader, Pagination, QueryBoundary, SearchInput, Select, StatCard, StatusBadge, TableShell, Textarea, usePagination, Badge } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { InventoryCategory, InventoryItem } from '@/types'

const CATEGORIES: { key: InventoryCategory; icon: typeof Wheat; tone: 'amber' | 'red' | 'green' | 'blue' | 'purple' | 'amber' | 'teal' | 'gray' }[] = [
  { key: 'Grains', icon: Wheat, tone: 'amber' }, { key: 'Meat', icon: Beef, tone: 'red' }, { key: 'Vegetables', icon: Carrot, tone: 'green' }, { key: 'Dairy', icon: Milk, tone: 'blue' },
  { key: 'Spices', icon: Flame, tone: 'purple' }, { key: 'Oil', icon: Droplet, tone: 'amber' }, { key: 'Beverages', icon: Package, tone: 'teal' }, { key: 'Others', icon: Boxes, tone: 'gray' },
]
const catTone = (c: string) => CATEGORIES.find((x) => x.key === c)?.tone ?? 'gray'
const UNITS = ['kg', 'liter', 'piece', 'bottle', 'gram', 'box']
const today = () => new Date().toISOString().slice(0, 10)

// ===================== Items =====================
export function ItemsPage() {
  const { t } = useTranslation()
  const { money, num, date } = useFormat()
  const q = useItems(); const mv = useMovements()
  const invalidate = useInvalidate()
  const [search, setSearch] = useState(''); const [cat, setCat] = useState(''); const [st, setSt] = useState('')
  const [del, setDel] = useState<InventoryItem | null>(null)
  const [spoil, setSpoil] = useState<InventoryItem | null>(null); const [spoilQty, setSpoilQty] = useState('')
  const items = q.data ?? []
  const rows = items.filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()) && (!cat || i.category === cat) && (!st || stockStatus(i) === st))
  const p = usePagination(rows, 10, [search, cat, st].join('|'))
  const delM = useMutation({ mutationFn: (id: string) => inventoryService.deleteItem(id), onSuccess: async () => { await invalidate('items', 'movements'); toast.success(t('inventory.deleted')); setDel(null) } })
  const spoilM = useMutation({
    mutationFn: () => inventoryService.recordSpoilage(spoil!.id, Number(spoilQty)),
    onSuccess: async () => { await invalidate('items', 'movements'); toast.success(t('inventory.spoilageRecorded')); setSpoil(null); setSpoilQty('') },
    onError: (e) => toast.error(e instanceof AppError && e.message.startsWith('insufficient') ? t('inventory.insufficient', { item: spoil?.name ?? '' }) : e.message),
  })
  const low = items.filter((i) => stockStatus(i) === 'low'); const out = items.filter((i) => stockStatus(i) === 'out')

  return (
    <>
      <PageHeader title={t('inventory.title')} subtitle={t('inventory.subtitle')} actions={<LinkButton to="/hotel/inventory/new"><Plus className="size-4" />{t('inventory.addItem')}</LinkButton>} />
      <QueryBoundary queries={[q, mv]}>
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Package} tone="green" label={t('inventory.totalItems')} value={num(items.length)} />
          <StatCard icon={Wallet} tone="blue" label={t('inventory.totalValue')} value={money(sum(items.map(stockValue)))} />
          <StatCard icon={AlertTriangle} tone="amber" label={t('inventory.lowItems')} value={num(low.length)} />
          <StatCard icon={AlertOctagon} tone="red" label={t('inventory.outItems')} value={num(out.length)} />
        </div>
        <Card>
          <div className="flex flex-wrap gap-3 border-b border-line p-4">
            <SearchInput value={search} onChange={setSearch} placeholder={t('inventory.search')} className="min-w-52 flex-1" />
            <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-44" aria-label={t('inventory.category')}><option value="">{t('inventory.allCategories')}</option>{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{t(`categories.${c.key}`)}</option>)}</Select>
            <Select value={st} onChange={(e) => setSt(e.target.value)} className="w-44" aria-label={t('common.status')}><option value="">{t('inventory.allStock')}</option><option value="in_stock">{t('status.in_stock')}</option><option value="low">{t('status.low')}</option><option value="out">{t('status.out')}</option></Select>
          </div>
          {rows.length === 0 ? <EmptyState title={t('inventory.empty')} description={t('common.tryAdjusting')} action={<LinkButton to="/hotel/inventory/new"><Plus className="size-4" />{t('inventory.addItem')}</LinkButton>} /> : <>
            <TableShell>
              <thead><tr><th className="th">{t('inventory.itemName')}</th><th className="th">{t('inventory.category')}</th><th className="th">{t('inventory.unit')}</th><th className="th">{t('inventory.quantity')}</th><th className="th">{t('inventory.minQty')}</th><th className="th">{t('inventory.unitCost')}</th><th className="th">{t('inventory.totalValue')}</th><th className="th">{t('inventory.spoiled')}</th><th className="th">{t('inventory.updated')}</th><th className="th">{t('common.status')}</th><th className="th">{t('common.actions')}</th></tr></thead>
              <tbody>{p.slice.map((i) => (
                <tr key={i.id} className="border-t border-line hover:bg-slate-50">
                  <td className="td font-medium">{i.name}</td><td className="td"><Badge tone={catTone(i.category)}>{t(`categories.${i.category}`)}</Badge></td><td className="td">{i.unit}</td>
                  <td className={cn('td font-medium', i.quantity <= 0 && 'text-red-600')}>{num(i.quantity, 1)}</td><td className="td">{num(i.minQuantity)}</td><td className="td whitespace-nowrap">{money(i.unitCost)}</td><td className="td whitespace-nowrap">{money(stockValue(i))}</td>
                  <td className="td">{i.spoiledQuantity ? num(i.spoiledQuantity, 1) : '-'}</td><td className="td whitespace-nowrap">{date(i.updatedAt)}</td><td className="td"><StatusBadge status={stockStatus(i)} /></td>
                  <td className="td"><div className="flex gap-0.5">
                    <Link to={`/hotel/inventory/${i.id}/edit`} aria-label={t('common.edit')} title={t('common.edit')} className="rounded-md p-1.5 text-brand-600 hover:bg-slate-100"><Pencil className="size-4" /></Link>
                    <IconButton label={t('inventory.recordSpoilage')} className="text-amber-600" onClick={() => setSpoil(i)}><AlertTriangle className="size-4" /></IconButton>
                    <IconButton label={t('common.delete')} className="text-red-500" onClick={() => setDel(i)}><Trash2 className="size-4" /></IconButton></div></td>
                </tr>))}</tbody>
            </TableShell><Pagination p={p} /></>}
        </Card>
      </QueryBoundary>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} loading={delM.isPending} title={t('common.delete')} message={t('inventory.deleteConfirm', { name: del?.name ?? '' })} confirmLabel={t('common.delete')} onConfirm={() => del && delM.mutate(del.id)} />
      <Modal open={!!spoil} onClose={() => setSpoil(null)} title={t('inventory.recordSpoilage')} footer={<><Button variant="secondary" onClick={() => setSpoil(null)}>{t('common.cancel')}</Button><Button disabled={!(Number(spoilQty) > 0)} loading={spoilM.isPending} onClick={() => spoilM.mutate()}>{t('common.save')}</Button></>}>
        <p className="mb-3 text-sm text-muted">{spoil?.name} · {t('inventory.quantity')}: {num(spoil?.quantity ?? 0, 1)} {spoil?.unit}</p>
        <Field label={t('inventory.spoiledQty')}><Input type="number" min={0} value={spoilQty} onChange={(e) => setSpoilQty(e.target.value)} autoFocus /></Field>
      </Modal>
    </>
  )
}

// ===================== Item form =====================
const itemSchema = z.object({
  name: z.string().trim().min(2, 'validation.required'),
  category: z.enum(['Grains', 'Meat', 'Vegetables', 'Dairy', 'Spices', 'Oil', 'Beverages', 'Others']),
  unit: z.string().min(1, 'validation.required'),
  minQuantity: z.number('validation.number').min(0, 'validation.nonNegative'),
  quantity: z.number('validation.number').min(0, 'validation.nonNegative'),
  unitCost: z.number('validation.number').min(0, 'validation.nonNegative'),
})
type ItemValues = z.infer<typeof itemSchema>

export function ItemForm() {
  const { id } = useParams(); const editing = !!id
  const { t } = useTranslation(); const navigate = useNavigate(); const invalidate = useInvalidate()
  const tenantId = useAuth((s) => s.user?.tenantId)
  const existing = useQuery({ queryKey: ['item', tenantId, id], queryFn: () => inventoryService.getItem(id!), enabled: editing && !!tenantId })
  const { register, handleSubmit, setValue, control, reset, formState: { errors } } = useForm<ItemValues>({ resolver: zodResolver(itemSchema), defaultValues: { name: '', category: 'Grains', unit: 'kg', minQuantity: 0, quantity: 0, unitCost: 0 } })
  const [loaded, setLoaded] = useState(false)
  if (existing.data && !loaded) { setLoaded(true); reset(existing.data) }
  const category = useWatch({ control, name: 'category' })
  const m = useMutation({
    mutationFn: (v: ItemValues) => (editing ? inventoryService.updateItem(id!, v) : inventoryService.createItem({ ...v, spoiledQuantity: 0 })),
    onSuccess: async () => { await invalidate('items'); toast.success(t(editing ? 'inventory.updated' : 'inventory.created')); navigate('/hotel/inventory') },
  })
  return (
    <>
      <PageHeader title={t(editing ? 'inventory.editItem' : 'inventory.addItem')} subtitle={t('inventory.formSubtitle')} breadcrumbs={[{ label: t('nav.inventory'), to: '/hotel/inventory' }, { label: t(editing ? 'inventory.editItem' : 'inventory.addItem') }]} actions={<Button variant="secondary" onClick={() => navigate(-1)}><DirIcon icon={ArrowLeft} className="size-4" />{t('common.back')}</Button>} />
      <QueryBoundary queries={editing ? [existing] : []}>
        <form onSubmit={handleSubmit((v) => m.mutate(v))} noValidate className="grid max-w-3xl gap-5">
          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <h3 className="font-semibold sm:col-span-2">{t('inventory.itemInfo')}</h3>
            <Field label={t('inventory.itemName')} required error={errors.name?.message}><Input placeholder="Rice (Basmati)" {...register('name')} /></Field>
            <Field label={t('inventory.unit')} required error={errors.unit?.message}><Select {...register('unit')}>{UNITS.map((u) => <option key={u}>{u}</option>)}</Select></Field>
            <Field label={t('inventory.minQty')} required error={errors.minQuantity?.message}><Input type="number" step="any" {...register('minQuantity', { valueAsNumber: true })} /></Field>
            <Field label={t('inventory.unitCost')} required error={errors.unitCost?.message} hint={t('inventory.priceHint')}><Input type="number" step="any" {...register('unitCost', { valueAsNumber: true })} /></Field>
            <Field label={t('inventory.currentQty')} error={errors.quantity?.message} hint={editing ? t('inventory.qtyViaMovements') : undefined}><Input type="number" step="any" disabled={editing} {...register('quantity', { valueAsNumber: true })} /></Field>
          </Card>
          <Card className="p-5">
            <h3 className="mb-3 font-semibold">{t('inventory.category')}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label={t('inventory.category')}>
              {CATEGORIES.map(({ key, icon: Icon }) => (
                <button key={key} type="button" role="radio" aria-checked={category === key} onClick={() => setValue('category', key)} className={cn('relative flex flex-col items-center gap-2 rounded-lg border p-3 text-sm', category === key ? 'border-brand-600 bg-brand-50' : 'border-line hover:bg-slate-50')}>
                  {category === key && <Check className="absolute end-1.5 top-1.5 size-4 rounded-full bg-emerald-500 p-0.5 text-white" />}
                  <Icon className="size-6 text-slate-500" />{t(`categories.${key}`)}
                </button>))}
            </div>
          </Card>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => navigate(-1)}>{t('common.cancel')}</Button><Button type="submit" loading={m.isPending}>{t('inventory.saveItem')}</Button></div>
        </form>
      </QueryBoundary>
    </>
  )
}

// ===================== Movement lists =====================
function MovementList({ kind }: { kind: 'in' | 'out' }) {
  const { t } = useTranslation()
  const { money, num, date } = useFormat()
  const mv = useMovements(); const items = useItems()
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [itemId, setItemId] = useState('')
  const rows = (mv.data ?? []).filter((m) => (kind === 'in' ? m.type === 'in' : m.type !== 'in') && (!from || m.date >= from) && (!to || m.date <= to) && (!itemId || m.itemId === itemId))
  const p = usePagination(rows, 10, [from, to, itemId, kind].join('|'))
  const name = (id: string) => items.data?.find((i) => i.id === id)
  const newTo = kind === 'in' ? '/hotel/inventory/stock-in/new' : '/hotel/inventory/stock-out/new'
  return (
    <>
      <PageHeader title={t(kind === 'in' ? 'inventory.stockInTitle' : 'inventory.stockOutTitle')} subtitle={t(kind === 'in' ? 'inventory.stockInSubtitle' : 'inventory.stockOutSubtitle')} actions={<LinkButton to={newTo}><Plus className="size-4" />{t(kind === 'in' ? 'inventory.newPurchase' : 'inventory.newHawala')}</LinkButton>} />
      <QueryBoundary queries={[mv, items]}>
        <Card>
          <div className="flex flex-wrap gap-3 border-b border-line p-4">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" aria-label={t('common.from')} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" aria-label={t('common.to')} />
            <Select value={itemId} onChange={(e) => setItemId(e.target.value)} className="w-52" aria-label={t('inventory.itemName')}><option value="">{t('inventory.allItems')}</option>{items.data?.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</Select>
          </div>
          {rows.length === 0 ? <EmptyState title={t('inventory.noMovements')} /> : <>
            <TableShell>
              <thead><tr><th className="th">{t('common.date')}</th><th className="th">{t('inventory.itemName')}</th><th className="th">{t('inventory.category')}</th><th className="th">{t('inventory.qty')}</th><th className="th">{t('inventory.unit')}</th>{kind === 'in' ? <><th className="th">{t('inventory.unitCost')}</th><th className="th">{t('common.total')}</th><th className="th">{t('inventory.supplier')}</th></> : <><th className="th">{t('inventory.reference')}</th><th className="th">{t('common.type')}</th></>}</tr></thead>
              <tbody>{p.slice.map((m) => {
                const it = name(m.itemId)
                return <tr key={m.id} className="border-t border-line"><td className="td whitespace-nowrap">{date(m.date)}</td><td className="td font-medium">{it?.name ?? '-'}</td><td className="td">{it ? <Badge tone={catTone(it.category)}>{t(`categories.${it.category}`)}</Badge> : '-'}</td><td className="td">{num(m.quantity, 1)}</td><td className="td">{it?.unit}</td>
                  {kind === 'in' ? <><td className="td">{money(m.unitCost)}</td><td className="td">{money(movementTotal(m))}</td><td className="td">{m.supplier}</td></> : <><td className="td">{m.reference}</td><td className="td"><Badge tone={m.type === 'spoilage' ? 'amber' : 'blue'}>{t(m.type === 'spoilage' ? 'inventory.spoilage' : 'inventory.issued')}</Badge></td></>}</tr>
              })}</tbody>
            </TableShell><Pagination p={p} /></>}
        </Card>
      </QueryBoundary>
    </>
  )
}
export const StockInPage = () => <MovementList kind="in" />
export const StockOutPage = () => <MovementList kind="out" />

// ===================== Movement forms (multi-line) =====================
const lineSchema = z.object({ itemId: z.string().min(1, 'validation.required'), quantity: z.number('validation.number').gt(0, 'validation.positive'), unitCost: z.number('validation.number').min(0, 'validation.nonNegative') })
const inSchema = z.object({ date: z.string().min(1, 'validation.required'), supplier: z.string().trim().min(2, 'validation.required'), reference: z.string(), notes: z.string(), lines: z.array(lineSchema).min(1, 'validation.oneLine') })
const outSchema = z.object({ date: z.string().min(1, 'validation.required'), reference: z.string().trim().min(2, 'validation.required'), clientName: z.string(), hall: z.string(), notes: z.string(), lines: z.array(lineSchema).min(1, 'validation.oneLine') })
type InValues = z.infer<typeof inSchema>
type OutValues = z.infer<typeof outSchema>

function LinesTotal({ control, items }: { control: Control<InValues> | Control<OutValues>; items: InventoryItem[] }) {
  const { t } = useTranslation(); const { money } = useFormat()
  const lines = useWatch({ control: control as Control<InValues>, name: 'lines' })
  const total = sum((lines ?? []).map((l) => (Number.isFinite(l.quantity) ? l.quantity : 0) * (Number.isFinite(l.unitCost) ? l.unitCost : 0)))
  void items
  return <div className="flex justify-between rounded-lg bg-brand-50 px-4 py-3 font-semibold"><span>{t('inventory.totalAmount')}</span><span>{money(round2(total))}</span></div>
}

export function StockInForm() {
  const { t } = useTranslation(); const navigate = useNavigate(); const invalidate = useInvalidate()
  const items = useItems(); const { money } = useFormat()
  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<InValues>({ resolver: zodResolver(inSchema), defaultValues: { date: today(), supplier: '', reference: '', notes: '', lines: [{ itemId: '', quantity: 0, unitCost: 0 }] } })
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const watched = useWatch({ control, name: 'lines' })
  const m = useMutation({ mutationFn: (v: InValues) => inventoryService.stockIn(v), onSuccess: async () => { await invalidate('items', 'movements'); toast.success(t('inventory.purchaseSaved')); navigate('/hotel/inventory/stock-in') }, onError: (e) => toast.error(e.message) })
  return (
    <>
      <PageHeader title={t('inventory.newPurchase')} subtitle={t('inventory.newPurchaseHint')} breadcrumbs={[{ label: t('nav.inventory'), to: '/hotel/inventory' }, { label: t('nav.stockIn'), to: '/hotel/inventory/stock-in' }, { label: t('inventory.newPurchase') }]} />
      <QueryBoundary queries={[items]}>
        <form onSubmit={handleSubmit((v) => m.mutate(v))} noValidate className="grid max-w-4xl gap-5">
          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label={t('inventory.purchaseDate')} required error={errors.date?.message}><Input type="date" {...register('date')} /></Field>
            <Field label={t('inventory.supplier')} required error={errors.supplier?.message}><Input {...register('supplier')} /></Field>
            <Field label={t('inventory.invoiceRef')}><Input dir="ltr" placeholder="INV-001" {...register('reference')} /></Field>
            <Field label={t('common.notes')}><Textarea rows={1} {...register('notes')} /></Field>
          </Card>
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">{t('inventory.addItems')}</h3><Button variant="secondary" onClick={() => append({ itemId: '', quantity: 0, unitCost: 0 })}><Plus className="size-4" />{t('inventory.addLine')}</Button></div>
            {errors.lines?.message && <p role="alert" className="mb-2 text-xs text-red-600">{t(errors.lines.message)}</p>}
            <TableShell>
              <thead><tr><th className="th">#</th><th className="th">{t('inventory.itemName')}</th><th className="th">{t('inventory.qty')}</th><th className="th">{t('inventory.unitPrice')}</th><th className="th">{t('common.total')}</th><th className="th" /></tr></thead>
              <tbody>{fields.map((f, i) => (
                <tr key={f.id} className="border-t border-line align-top">
                  <td className="td">{i + 1}</td>
                  <td className="td"><Select {...register(`lines.${i}.itemId`, { onChange: (e) => { const it = items.data?.find((x) => x.id === e.target.value); if (it) setValue(`lines.${i}.unitCost`, it.unitCost) } })}><option value="">{t('common.select')}</option>{items.data?.map((it) => <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>)}</Select>{errors.lines?.[i]?.itemId && <span className="text-xs text-red-600">{t(errors.lines[i]!.itemId!.message!)}</span>}</td>
                  <td className="td"><Input type="number" step="any" className="w-28" {...register(`lines.${i}.quantity`, { valueAsNumber: true })} />{errors.lines?.[i]?.quantity && <span className="text-xs text-red-600">{t(errors.lines[i]!.quantity!.message!)}</span>}</td>
                  <td className="td"><Input type="number" step="any" className="w-28" {...register(`lines.${i}.unitCost`, { valueAsNumber: true })} /></td>
                  <td className="td whitespace-nowrap">{money(round2((watched?.[i]?.quantity || 0) * (watched?.[i]?.unitCost || 0)))}</td>
                  <td className="td"><IconButton label={t('common.delete')} className="text-red-500" disabled={fields.length === 1} onClick={() => remove(i)}><Trash2 className="size-4" /></IconButton></td>
                </tr>))}</tbody>
            </TableShell>
            <div className="mt-4"><LinesTotal control={control} items={items.data ?? []} /></div>
            <p className="mt-3 text-xs text-muted">{t('inventory.priceFollowsMarket')}</p>
          </Card>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => navigate(-1)}>{t('common.cancel')}</Button><Button type="submit" loading={m.isPending}>{t('inventory.savePurchase')}</Button></div>
        </form>
      </QueryBoundary>
    </>
  )
}

export function StockOutForm() {
  const { t } = useTranslation(); const navigate = useNavigate(); const invalidate = useInvalidate()
  const items = useItems(); const { num, money } = useFormat()
  const { register, control, handleSubmit, setError, formState: { errors } } = useForm<OutValues>({ resolver: zodResolver(outSchema), defaultValues: { date: today(), reference: '', clientName: '', hall: '', notes: '', lines: [{ itemId: '', quantity: 0, unitCost: 0 }] } })
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const watched = useWatch({ control, name: 'lines' })
  const m = useMutation({
    mutationFn: (v: OutValues) => inventoryService.stockOut({ date: v.date, reference: v.reference + (v.clientName ? ` - ${v.clientName}` : ''), notes: v.notes, lines: v.lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })) }),
    onSuccess: async () => { await invalidate('items', 'movements'); toast.success(t('inventory.hawalaSaved')); navigate('/hotel/inventory/stock-out') },
    onError: (e) => { if (e instanceof AppError && e.message.startsWith('insufficient')) setError('lines', { message: 'validation.insufficientStock' }); else toast.error(e.message) },
  })
  const itemOf = (id?: string) => items.data?.find((x) => x.id === id)
  const cost = sum((watched ?? []).map((l) => (l.quantity || 0) * (itemOf(l.itemId)?.unitCost ?? 0)))
  const overs = (watched ?? []).some((l) => itemOf(l.itemId) && l.quantity > itemOf(l.itemId)!.quantity)
  return (
    <>
      <PageHeader title={t('inventory.newHawala')} subtitle={t('inventory.newHawalaHint')} breadcrumbs={[{ label: t('nav.inventory'), to: '/hotel/inventory' }, { label: t('nav.stockOut'), to: '/hotel/inventory/stock-out' }, { label: t('inventory.newHawala') }]} />
      <QueryBoundary queries={[items]}>
        <form onSubmit={handleSubmit((v) => m.mutate(v))} noValidate className="grid max-w-4xl gap-5">
          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label={t('inventory.hawalaDate')} required error={errors.date?.message}><Input type="date" {...register('date')} /></Field>
            <Field label={t('inventory.eventRef')} required error={errors.reference?.message}><Input placeholder="Wedding - Ahmad Khan" {...register('reference')} /></Field>
            <Field label={t('bookings.client')}><Input {...register('clientName')} /></Field>
            <Field label={t('bookings.hall')}><Input {...register('hall')} /></Field>
            <div className="sm:col-span-2"><Field label={t('common.notes')}><Textarea rows={2} {...register('notes')} /></Field></div>
          </Card>
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">{t('inventory.addItems')}</h3><Button variant="secondary" onClick={() => append({ itemId: '', quantity: 0, unitCost: 0 })}><Plus className="size-4" />{t('inventory.addLine')}</Button></div>
            {errors.lines?.message && <p role="alert" className="mb-2 text-xs text-red-600">{t(errors.lines.message)}</p>}
            <TableShell>
              <thead><tr><th className="th">#</th><th className="th">{t('inventory.itemName')}</th><th className="th">{t('inventory.availableQty')}</th><th className="th">{t('inventory.qty')}</th><th className="th">{t('inventory.unit')}</th><th className="th">{t('inventory.estCost')}</th><th className="th" /></tr></thead>
              <tbody>{fields.map((f, i) => {
                const it = itemOf(watched?.[i]?.itemId); const q = watched?.[i]?.quantity || 0
                return (
                  <tr key={f.id} className="border-t border-line align-top"><td className="td">{i + 1}</td>
                    <td className="td"><Select {...register(`lines.${i}.itemId`)}><option value="">{t('common.select')}</option>{items.data?.filter((x) => x.quantity > 0).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></td>
                    <td className="td">{it ? num(it.quantity, 1) : '-'}</td>
                    <td className="td"><Input type="number" step="any" className={cn('w-28', it && q > it.quantity && 'border-red-400')} {...register(`lines.${i}.quantity`, { valueAsNumber: true })} />{it && q > it.quantity && <span className="block text-xs text-red-600">{t('validation.insufficientStock')}</span>}</td>
                    <td className="td">{it?.unit ?? '-'}</td><td className="td whitespace-nowrap">{money(round2(q * (it?.unitCost ?? 0)))}</td>
                    <td className="td"><IconButton label={t('common.delete')} className="text-red-500" disabled={fields.length === 1} onClick={() => remove(i)}><Trash2 className="size-4" /></IconButton></td></tr>)
              })}</tbody>
            </TableShell>
            <div className="mt-4 flex justify-between rounded-lg bg-brand-50 px-4 py-3 font-semibold"><span>{t('inventory.totalEstCost')}</span><span>{money(round2(cost))}</span></div>
            <p className="mt-3 text-xs text-muted">{t('inventory.noNegativeRule')}</p>
          </Card>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => navigate(-1)}>{t('common.cancel')}</Button><Button type="submit" disabled={overs} loading={m.isPending}>{t('inventory.saveHawala')}</Button></div>
        </form>
      </QueryBoundary>
    </>
  )
}
