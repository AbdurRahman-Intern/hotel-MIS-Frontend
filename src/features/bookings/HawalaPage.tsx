import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Drumstick, FileText, Leaf, Printer, Send } from 'lucide-react'
import { useBookings, useInvalidate, useItems, useMenus } from '@/hooks/queries'
import { inventoryService } from '@/services/inventory.service'
import { useFormat } from '@/hooks/useFormat'
import { AppError } from '@/lib/axios'
import { buildRequisition, isMeat, isVegetable, sum, type RequisitionLine } from '@/lib/domain'
import { Button, ConfirmDialog, EmptyState, Field, Input, PageHeader, QueryBoundary, SectionCard, Select, StatusBadge, TableShell, Card } from '@/components/ui'

/**
 * Warehouse requisition ("hawala"): ingredient needs are CALCULATED from menu recipe x guest count.
 * Calculating does NOT touch stock. Stock is only deducted when the user presses "Send to warehouse",
 * which creates stock-out movements through inventoryService.stockOut (negative stock is rejected).
 */
export function HawalaPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { money, num, date } = useFormat()
  const bookings = useBookings(); const menus = useMenus(); const items = useItems()
  const invalidate = useInvalidate()
  const [extra, setExtra] = useState(0)
  const [confirm, setConfirm] = useState(false)

  const usable = (bookings.data ?? []).filter((b) => b.status !== 'cancelled' && b.status !== 'draft').sort((a, b) => a.eventDate.localeCompare(b.eventDate))
  const booking = usable.find((b) => b.id === id)
  const menu = menus.data?.find((m) => m.id === booking?.menuId)
  const guests = (booking?.guestCount ?? 0) + extra
  const lines = buildRequisition(menu, guests, items.data ?? [])
  const meat = lines.filter(isMeat); const veg = lines.filter(isVegetable)
  const low = lines.filter((l) => l.status === 'low')
  const totalCost = sum(lines.map((l) => l.cost))
  const availability = lines.length ? Math.round(((lines.length - low.length) / lines.length) * 100) : 0
  const issuable = lines.filter((l) => l.required > 0 && l.available >= l.required)

  const sendM = useMutation({
    mutationFn: () => inventoryService.stockOut({ date: new Date().toISOString().slice(0, 10), reference: `${t('hawala.refPrefix')} ${booking!.reference}`, bookingId: booking!.id, lines: issuable.map((l) => ({ itemId: l.item.id, quantity: l.required })) }),
    onSuccess: async () => { await invalidate('items', 'movements'); toast.success(t('hawala.sent', { count: issuable.length })); setConfirm(false) },
    onError: (e) => toast.error(e instanceof AppError && e.message.startsWith('insufficient') ? t('inventory.insufficient', { item: e.message.split(':')[1] }) : t('errors.generic')),
  })

  const group = (title: string, rows: RequisitionLine[], tone: string, Icon: typeof Drumstick) => (
    <section className={`card overflow-hidden`}>
      <div className={`flex items-center gap-3 px-4 py-3 ${tone}`}><Icon className="size-5" /><div><p className="font-semibold">{title}</p></div></div>
      {rows.length === 0 ? <p className="p-4 text-sm text-muted">{t('hawala.noneInGroup')}</p> : <>
        <TableShell><thead><tr><th className="th">{t('inventory.itemName')}</th><th className="th">{t('hawala.required')}</th><th className="th">{t('inventory.unit')}</th><th className="th">{t('hawala.totalCost')}</th></tr></thead>
          <tbody>{rows.map((l) => <tr key={l.item.id} className="border-t border-line"><td className="td">{l.item.name}</td><td className="td">{num(l.required, 1)}</td><td className="td">{l.item.unit}</td><td className="td">{money(l.cost)}</td></tr>)}</tbody></TableShell>
        <div className={`flex justify-between px-4 py-3 text-sm font-bold ${tone}`}><span>{t('hawala.groupTotal')}</span><span>{money(sum(rows.map((r) => r.cost)))}</span></div></>}
    </section>
  )

  return (
    <>
      <PageHeader title={t('hawala.title')} subtitle={t('hawala.subtitle')} breadcrumbs={[{ label: t('nav.bookings'), to: '/hotel/bookings' }, { label: t('nav.hawala') }]} />
      <QueryBoundary queries={[bookings, menus, items]}>
        <Card className="mb-5 p-4">
          <Field label={t('hawala.pickBooking')}>
            <Select value={id ?? ''} onChange={(e) => navigate(e.target.value ? `/hotel/bookings/${e.target.value}/hawala` : '/hotel/bookings/hawala')}>
              <option value="">{t('common.select')}</option>
              {usable.map((b) => <option key={b.id} value={b.id}>{b.reference} · {b.clientName} · {date(b.eventDate)}</option>)}
            </Select>
          </Field>
        </Card>
        {!booking ? <Card><EmptyState icon={FileText} title={t('hawala.pickTitle')} description={t('hawala.pickText')} /></Card> : (
          <div className="space-y-5">
            <Card className="grid gap-4 p-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
              {([['bookings.reference', <span className="ltr-isolate">{booking.reference}</span>], ['bookings.client', booking.clientName], ['bookings.eventDate', date(booking.eventDate)], ['bookings.guests', num(booking.guestCount)], ['bookings.menu', menu?.name ?? '-'], ['common.status', <StatusBadge status={booking.status} />]] as [string, React.ReactNode][]).map(([k, v]) => (
                <div key={k}><p className="text-xs text-muted">{t(k)}</p><p className="mt-0.5 font-semibold">{v}</p></div>))}
            </Card>

            <SectionCard title={t('hawala.items')} subtitle={t('hawala.calcFrom', { count: num(guests) })}
              action={<div className="no-print flex flex-wrap items-end gap-2">
                <label className="text-xs text-muted">{t('hawala.extraGuests')}<Input type="number" min={0} value={extra} onChange={(e) => setExtra(Math.max(0, Number(e.target.value) || 0))} className="mt-1 w-28" /></label>
                <Button variant="secondary" onClick={() => window.print()}><Printer className="size-4" />{t('common.print')}</Button>
                <Button disabled={issuable.length === 0} onClick={() => setConfirm(true)}><Send className="size-4" />{t('hawala.send')}</Button></div>}>
              {lines.length === 0 ? <EmptyState title={t('hawala.noRecipe')} /> : (
                <TableShell>
                  <thead><tr><th className="th">#</th><th className="th">{t('inventory.itemName')}</th><th className="th">{t('inventory.category')}</th><th className="th">{t('hawala.perPerson')}</th><th className="th">{t('hawala.required')}</th><th className="th">{t('inventory.unit')}</th><th className="th">{t('hawala.available')}</th><th className="th">{t('inventory.unitCost')}</th><th className="th">{t('hawala.totalCost')}</th><th className="th">{t('common.status')}</th></tr></thead>
                  <tbody>{lines.map((l, i) => (
                    <tr key={l.item.id} className="border-t border-line"><td className="td">{i + 1}</td><td className="td font-medium">{l.item.name}</td><td className="td">{t(`categories.${l.item.category}`)}</td><td className="td">{num(l.perPerson, 3)} × {num(guests)}</td><td className="td font-semibold">{num(l.required, 1)}</td><td className="td">{l.item.unit}</td><td className="td">{num(l.available, 1)}</td><td className="td">{money(l.item.unitCost)}</td><td className="td">{money(l.cost)}</td><td className="td"><StatusBadge status={l.status} /></td></tr>))}</tbody>
                </TableShell>)}
              <p className="mt-3 text-xs text-muted">{t('hawala.note')}</p>
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-3">
              {group(t('hawala.meat'), meat, 'bg-red-50 text-red-800', Drumstick)}
              {group(t('hawala.veg'), veg, 'bg-emerald-50 text-emerald-800', Leaf)}
              <SectionCard title={t('hawala.summary')}>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted">{t('hawala.totalFood')}</dt><dd className="text-lg font-bold">{money(totalCost)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">{t('hawala.lowItems')}</dt><dd className="font-bold text-red-600">{num(low.length)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">{t('hawala.availability')}</dt><dd className="font-bold text-emerald-600">{num(availability)}%</dd></div>
                </dl>
                {low.length > 0 && <ul className="mt-3 space-y-1 rounded-lg bg-red-50 p-3 text-xs text-red-800">{low.map((l) => <li key={l.item.id}>{l.item.name}: {t('hawala.short', { qty: num(l.shortfall, 1), unit: l.item.unit })}</li>)}</ul>}
                <Link to="/hotel/inventory/stock-in/new" className="no-print mt-3 block text-sm text-brand-600">{t('hawala.purchaseMissing')}</Link>
              </SectionCard>
            </div>
          </div>
        )}
      </QueryBoundary>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} loading={sendM.isPending} tone="primary" title={t('hawala.send')} message={t('hawala.sendConfirm', { count: issuable.length, skipped: lines.length - issuable.length })} confirmLabel={t('hawala.send')} onConfirm={() => sendM.mutate()} />
    </>
  )
}
