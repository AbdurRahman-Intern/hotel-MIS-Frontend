import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarDays, ClipboardList, Pencil, Phone, Printer, Plus, User, XCircle } from 'lucide-react'
import { bookingService } from '@/services/bookings.service'
import { useFormat } from '@/hooks/useFormat'
import { useInvalidate, useMenus } from '@/hooks/queries'
import { calcBookingTotals } from '@/lib/domain'
import { Button, ConfirmDialog, Field, Input, LinkButton, Modal, StatusBadge } from '@/components/ui'
import type { Booking } from '@/types'

function Row({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return <div className="flex items-center justify-between gap-3 py-1.5 text-sm"><span className="text-muted">{k}</span><span className={strong ? 'font-bold' : 'font-medium'}>{v}</span></div>
}

export function BookingDetailPanel({ booking: b, onChanged }: { booking: Booking; onChanged?: () => void }) {
  const { t } = useTranslation()
  const { money, num, date } = useFormat()
  const menus = useMenus()
  const invalidate = useInvalidate()
  const [payOpen, setPayOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const totals = calcBookingTotals(b)
  const menu = menus.data?.find((m) => m.id === b.menuId)
  const canceled = b.status === 'cancelled'

  const payM = useMutation({
    mutationFn: () => bookingService.addPayment(b.id, Number(amount), new Date().toISOString().slice(0, 10)),
    onSuccess: async () => { await invalidate('bookings'); toast.success(t('bookings.paymentRecorded')); setPayOpen(false); setAmount(''); onChanged?.() },
  })
  const cancelM = useMutation({
    mutationFn: () => bookingService.cancelBooking(b.id),
    onSuccess: async () => { await invalidate('bookings'); toast.success(t('bookings.cancelled')); setCancelOpen(false); onChanged?.() },
  })
  const payValid = Number(amount) > 0 && Number(amount) <= totals.remaining

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div><p className="text-xs text-muted">{t('bookings.reference')}</p><p className="font-bold ltr-isolate">{b.reference}</p></div>
        <StatusBadge status={b.status} />
      </div>
      <div className="rounded-lg border border-line p-3">
        <p className="mb-1 flex items-center gap-2 text-sm font-semibold"><User className="size-4 text-brand-600" />{t('bookings.clientInfo')}</p>
        <Row k={t('bookings.client')} v={b.clientName} />
        <Row k={t('common.phone')} v={<span className="flex items-center gap-1 ltr-isolate"><Phone className="size-3.5 text-brand-600" />{b.clientPhone}</span>} />
      </div>
      <div className="rounded-lg border border-line p-3">
        <p className="mb-1 flex items-center gap-2 text-sm font-semibold"><CalendarDays className="size-4 text-brand-600" />{t('bookings.eventDetails')}</p>
        <Row k={t('bookings.eventDate')} v={date(b.eventDate)} />
        <Row k={t('bookings.shift')} v={t(`shift.${b.shift}`)} />
        <Row k={t('bookings.eventType')} v={t(`eventTypes.${b.eventType}`)} />
        <Row k={t('bookings.guests')} v={num(b.guestCount)} />
        <Row k={t('bookings.hall')} v={b.hallName} />
      </div>
      <div className="rounded-lg border border-line p-3">
        <p className="mb-1 flex items-center gap-2 text-sm font-semibold"><ClipboardList className="size-4 text-brand-600" />{t('bookings.menuServices')}</p>
        <Row k={t('bookings.menu')} v={menu?.name ?? '-'} />
        <Row k={t('bookings.foodPrice')} v={money(b.foodPricePerPerson)} />
        <Row k={t('bookings.photography')} v={money(b.photographyPrice)} />
        <Row k={t('bookings.decoration')} v={money(b.decorationPrice)} />
        <Row k={t('bookings.serviceCharge')} v={money(b.serviceCharge)} />
        {b.otherCharges > 0 && <Row k={t('bookings.otherCharges')} v={money(b.otherCharges)} />}
        {b.discount > 0 && <Row k={t('bookings.discount')} v={`- ${money(b.discount)}`} />}
      </div>
      <div className="rounded-lg border border-line bg-slate-50 p-3">
        <p className="mb-1 text-sm font-semibold">{t('bookings.paymentSummary')}</p>
        <Row k={t('bookings.estimatedTotal')} v={money(totals.estimatedTotal)} strong />
        <Row k={t('bookings.advance')} v={<span className="text-emerald-600">{money(b.advancePaid)}</span>} />
        {b.payments.map((p, i) => <Row key={i} k={`${t('bookings.payment')} · ${date(p.date)}`} v={<span className="text-emerald-600">{money(p.amount)}</span>} />)}
        <Row k={t('bookings.remaining')} v={<span className={totals.remaining > 0 ? 'text-red-600' : 'text-emerald-600'}>{money(totals.remaining)}</span>} strong />
        <p className="mt-2 text-[11px] text-muted">{t('bookings.estimateNote')}</p>
      </div>
      {b.notes && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{b.notes}</p>}
      <div className="no-print flex flex-wrap gap-2">
        {!canceled && <LinkButton to={`/hotel/bookings/${b.id}/edit`} variant="secondary"><Pencil className="size-4" />{t('common.edit')}</LinkButton>}
        <Button variant="secondary" onClick={() => window.print()}><Printer className="size-4" />{t('common.print')}</Button>
        <Link to={`/hotel/bookings/${b.id}/hawala`} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"><ClipboardList className="size-4" />{t('nav.hawala')}</Link>
        {!canceled && totals.remaining > 0 && <Button variant="success" onClick={() => setPayOpen(true)}><Plus className="size-4" />{t('bookings.addPayment')}</Button>}
        {!canceled && b.status !== 'completed' && <Button variant="ghost" className="text-red-600" onClick={() => setCancelOpen(true)}><XCircle className="size-4" />{t('bookings.cancel')}</Button>}
      </div>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={t('bookings.addPayment')} footer={<><Button variant="secondary" onClick={() => setPayOpen(false)}>{t('common.cancel')}</Button><Button disabled={!payValid} loading={payM.isPending} onClick={() => payM.mutate()}>{t('common.save')}</Button></>}>
        <Field label={t('bookings.paymentAmount')} hint={`${t('bookings.remaining')}: ${money(totals.remaining)}`} error={amount && !payValid ? 'validation.paymentRange' : undefined}>
          <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
      </Modal>
      <ConfirmDialog open={cancelOpen} onClose={() => setCancelOpen(false)} loading={cancelM.isPending} title={t('bookings.cancel')} message={t('bookings.cancelConfirm', { name: b.clientName })} confirmLabel={t('bookings.cancelYes')} onConfirm={() => cancelM.mutate()} />
    </div>
  )
}
