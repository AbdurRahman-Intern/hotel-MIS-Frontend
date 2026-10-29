import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CheckCircle2, AlertTriangle, ArrowLeft, Info } from 'lucide-react'
import { bookingService, type BookingInput } from '@/services/bookings.service'
import { AppError } from '@/lib/axios'
import { useBookings, useHalls, useInvalidate, useMenus } from '@/hooks/queries'
import { useFormat } from '@/hooks/useFormat'
import { useAuth } from '@/stores/auth.store'
import { calcBookingTotals } from '@/lib/domain'
import { Button, DirIcon, ErrorState, Field, Input, PageHeader, QueryBoundary, SectionCard, Select, Textarea, Card } from '@/components/ui'
import type { BookingStatus } from '@/types'

const num = (min = 0) => z.number('validation.number').min(min, 'validation.nonNegative')
const schema = z.object({
  clientName: z.string().trim().min(2, 'validation.required'),
  clientPhone: z.string().trim().min(7, 'validation.phone'),
  eventType: z.enum(['Wedding', 'Engagement', 'Reception', 'Birthday', 'Corporate', 'Other']),
  eventDate: z.string().min(1, 'validation.required'),
  shift: z.enum(['Day', 'Night']),
  guestCount: z.number('validation.number').int('validation.integer').min(1, 'validation.guestMin'),
  hallName: z.string().min(1, 'validation.required'),
  menuId: z.string().min(1, 'validation.required'),
  foodPricePerPerson: num(), photographyPrice: num(), decorationPrice: num(), serviceCharge: num(), otherCharges: num(), discount: num(), advancePaid: num(),
  notes: z.string().max(500, 'validation.maxNotes'),
  status: z.enum(['draft', 'pending', 'confirmed', 'completed', 'cancelled']),
}).refine((v) => v.advancePaid <= calcBookingTotals({ ...v, payments: [] }).estimatedTotal, { path: ['advancePaid'], message: 'validation.advanceTooHigh' })
type Values = z.infer<typeof schema>

export function BookingForm() {
  const { id } = useParams()
  const editing = !!id
  const { t } = useTranslation()
  const { money } = useFormat()
  const navigate = useNavigate()
  const invalidate = useInvalidate()
  const tenantId = useAuth((s) => s.user?.tenantId)
  const menus = useMenus()
  const halls = useHalls()
  const all = useBookings()
  const existing = useQuery({ queryKey: ['booking', tenantId, id], queryFn: () => bookingService.getBooking(id!), enabled: editing && !!tenantId })

  const { register, handleSubmit, control, setValue, setError, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { clientName: '', clientPhone: '', eventType: 'Wedding', eventDate: '', shift: 'Day', guestCount: 100, hallName: '', menuId: '', foodPricePerPerson: 0, photographyPrice: 0, decorationPrice: 0, serviceCharge: 0, otherCharges: 0, discount: 0, advancePaid: 0, notes: '', status: 'confirmed' },
  })
  const loaded = useRef(false)
  useEffect(() => { if (existing.data && !loaded.current) { loaded.current = true; reset({ ...existing.data }) } }, [existing.data, reset])

  const w = useWatch({ control })
  const safe = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : 0)
  const totals = calcBookingTotals({ guestCount: safe(w.guestCount), foodPricePerPerson: safe(w.foodPricePerPerson), photographyPrice: safe(w.photographyPrice), decorationPrice: safe(w.decorationPrice), serviceCharge: safe(w.serviceCharge), otherCharges: safe(w.otherCharges), discount: safe(w.discount), advancePaid: safe(w.advancePaid), payments: existing.data?.payments })
  const menu = menus.data?.find((m) => m.id === w.menuId)

  const avail = useQuery({
    queryKey: ['hall-availability', tenantId, w.hallName, w.eventDate, w.shift, id, all.dataUpdatedAt],
    queryFn: () => bookingService.isHallAvailable(w.hallName!, w.eventDate!, w.shift!, id),
    enabled: !!tenantId && !!w.hallName && !!w.eventDate && !!w.shift,
  })

  const m = useMutation({
    mutationFn: (v: Values) => {
      const input: BookingInput = { ...v, payments: existing.data?.payments ?? [] }
      return editing ? bookingService.updateBooking(id!, input) : bookingService.createBooking(input)
    },
    onSuccess: async (b, v) => {
      await invalidate('bookings')
      toast.success(t(editing ? 'bookings.updated' : v.status === 'draft' ? 'bookings.draftSaved' : 'bookings.created'))
      navigate(goHawala.current ? `/hotel/bookings/${b.id}/hawala` : `/hotel/bookings/${b.id}`)
    },
    onError: (e) => {
      if (e instanceof AppError && e.message === 'hall_taken') setError('hallName', { message: 'validation.hallTaken' })
      else toast.error(t('errors.generic'))
    },
  })
  const goHawala = useRef(false)
  const submit = (status: BookingStatus, hawala = false) => handleSubmit((v) => { goHawala.current = hawala; m.mutate({ ...v, status }) })()

  const field = (name: keyof Values, label: string, required = true, extra?: { number?: boolean; hint?: string }) => (
    <Field label={label} required={required} error={errors[name]?.message as string | undefined} hint={extra?.hint}>
      <Input type={extra?.number ? 'number' : 'text'} min={extra?.number ? 0 : undefined} step={extra?.number ? 'any' : undefined} {...register(name, extra?.number ? { valueAsNumber: true } : undefined)} />
    </Field>
  )

  return (
    <>
      <PageHeader title={t(editing ? 'bookings.edit' : 'bookings.new')} subtitle={t('bookings.newSubtitle')} breadcrumbs={[{ label: t('nav.bookings'), to: '/hotel/bookings' }, { label: t(editing ? 'bookings.edit' : 'bookings.new') }]}
        actions={<Button variant="secondary" onClick={() => navigate(-1)}><DirIcon icon={ArrowLeft} className="size-4" />{t('common.back')}</Button>} />
      <QueryBoundary queries={editing ? [menus, halls, existing] : [menus, halls]}>
        {editing && existing.data?.status === 'cancelled' ? <Card><ErrorState error={new AppError('forbidden', 'cancelled')} /></Card> : (
          <form onSubmit={(e) => e.preventDefault()} noValidate className="grid gap-5 xl:grid-cols-[1fr_1fr_22rem]">
            <div className="xl:col-span-3 grid gap-4 md:grid-cols-3">
              <div className="card flex items-center gap-3 p-4">
                {!w.hallName || !w.eventDate ? <Info className="size-8 text-slate-400" /> : avail.data === false ? <AlertTriangle className="size-8 text-red-500" /> : <CheckCircle2 className="size-8 text-emerald-500" />}
                <div><p className="text-sm font-semibold">{t('bookings.hallAvailability')}</p><p className={`text-sm ${avail.data === false ? 'text-red-600' : 'text-emerald-600'}`}>{!w.hallName || !w.eventDate ? t('bookings.pickHallDate') : avail.data === false ? t('bookings.hallBusy', { hall: w.hallName }) : t('bookings.hallFree', { hall: w.hallName })}</p></div>
              </div>
              <div className="card p-4"><p className="text-sm font-semibold">{t('bookings.selectedMenu')}</p><p className="text-sm text-muted">{menu ? `${menu.name} · ${money(w.foodPricePerPerson ?? menu.pricePerPerson)} ${t('bookings.perPerson')}` : t('bookings.noMenu')}</p></div>
              <div className="card p-4"><p className="text-sm font-semibold">{t('bookings.expectedRevenue')}</p><p className="text-xl font-bold text-emerald-600">{money(totals.estimatedTotal)}</p><p className="text-xs text-muted">{t('bookings.estimateNote')}</p></div>
            </div>

            <SectionCard title={t('bookings.bookingInfo')} subtitle={t('bookings.bookingInfoHint')}>
              <div className="space-y-3.5">
                {field('clientName', t('bookings.clientName'))}
                <Field label={t('bookings.clientPhone')} required error={errors.clientPhone?.message}><Input dir="ltr" placeholder="+93 700 123 456" {...register('clientPhone')} /></Field>
                {field('eventDate', t('bookings.eventDate'))}
                <Field label={t('bookings.eventTime')} required>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Day', 'Night'] as const).map((s) => (
                      <label key={s} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm ${w.shift === s ? 'border-brand-600 bg-brand-50' : 'border-line'}`}>
                        <input type="radio" value={s} className="mt-1" {...register('shift')} /><span><span className="block font-medium">{t(`shift.${s}`)}</span><span className="ltr-isolate block text-xs text-muted">{t(`shift.${s}Hours`)}</span></span>
                      </label>))}
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t('bookings.eventType')} required><Select {...register('eventType')}>{['Wedding', 'Engagement', 'Reception', 'Birthday', 'Corporate', 'Other'].map((x) => <option key={x} value={x}>{t(`eventTypes.${x}`)}</option>)}</Select></Field>
                  <Field label={t('bookings.hall')} required error={errors.hallName?.message}><Select {...register('hallName')}><option value="">{t('common.select')}</option>{halls.data?.map((h) => <option key={h.id} value={h.name}>{h.name}</option>)}</Select></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {field('guestCount', t('bookings.guestCount'), true, { number: true })}
                  <Field label={t('bookings.menu')} required error={errors.menuId?.message}>
                    <Select {...register('menuId', { onChange: (e) => { const mm = menus.data?.find((x) => x.id === e.target.value); if (mm) setValue('foodPricePerPerson', mm.pricePerPerson, { shouldValidate: true }) } })}>
                      <option value="">{t('common.select')}</option>{menus.data?.map((mm) => <option key={mm.id} value={mm.id}>{mm.name} ({money(mm.pricePerPerson)})</option>)}
                    </Select>
                  </Field>
                </div>
                <Field label={t('common.notes')} error={errors.notes?.message}><Textarea placeholder={t('bookings.notesPlaceholder')} maxLength={500} {...register('notes')} /></Field>
              </div>
            </SectionCard>

            <SectionCard title={t('bookings.pricing')} subtitle={t('bookings.pricingHint')}>
              <div className="space-y-3.5">
                {field('foodPricePerPerson', t('bookings.foodPrice'), true, { number: true })}
                {field('photographyPrice', t('bookings.photography'), false, { number: true })}
                {field('decorationPrice', t('bookings.decoration'), false, { number: true })}
                {field('serviceCharge', t('bookings.serviceCharge'), false, { number: true })}
                {field('advancePaid', t('bookings.advancePayment'), false, { number: true })}
                {field('discount', t('bookings.discount'), false, { number: true })}
                {field('otherCharges', t('bookings.otherCharges'), false, { number: true })}
                {editing && <Field label={t('common.status')}><Select {...register('status')}>{['draft', 'pending', 'confirmed', 'completed'].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}</Select></Field>}
              </div>
            </SectionCard>

            <div className="h-fit space-y-4 xl:sticky xl:top-20">
              <SectionCard title={t('bookings.estimatedCalc')} subtitle={t('bookings.autoCalc')}>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted">{t('bookings.foodCost')} <span className="text-xs">({safe(w.guestCount)} × {money(safe(w.foodPricePerPerson))})</span></dt><dd className="font-medium">{money(totals.foodTotal)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">{t('bookings.photography')}</dt><dd>{money(safe(w.photographyPrice))}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">{t('bookings.decoration')}</dt><dd>{money(safe(w.decorationPrice))}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">{t('bookings.serviceCharge')}</dt><dd>{money(safe(w.serviceCharge))}</dd></div>
                  {safe(w.otherCharges) > 0 && <div className="flex justify-between"><dt className="text-muted">{t('bookings.otherCharges')}</dt><dd>{money(safe(w.otherCharges))}</dd></div>}
                  <div className="flex justify-between border-t border-line pt-2"><dt className="text-muted">{t('bookings.subtotal')}</dt><dd className="font-medium">{money(totals.subtotal)}</dd></div>
                  <div className="flex justify-between text-emerald-600"><dt>{t('bookings.discount')}</dt><dd>- {money(safe(w.discount))}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">{t('bookings.estimatedTotal')}</dt><dd className="font-semibold">{money(totals.estimatedTotal)}</dd></div>
                  <div className="flex justify-between text-red-600"><dt>{t('bookings.advancePaid')}</dt><dd>- {money(totals.received)}</dd></div>
                </dl>
                <div className="mt-3 flex items-center justify-between rounded-lg bg-brand-50 px-3 py-3"><span className="text-sm font-semibold">{t('bookings.remaining')}</span><span className="text-xl font-bold text-brand-700">{money(totals.remaining)}</span></div>
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{t('bookings.stockNote')}</p>
              </SectionCard>
            </div>

            <div className="xl:col-span-3 flex flex-wrap justify-end gap-2 rounded-xl border border-line bg-white p-4">
              <Button variant="secondary" onClick={() => navigate(-1)}>{t('common.cancel')}</Button>
              {!editing && <Button variant="secondary" loading={m.isPending} onClick={() => void submit('draft')}>{t('bookings.saveDraft')}</Button>}
              <Button variant={editing ? 'primary' : 'secondary'} loading={m.isPending} onClick={() => void submit(editing ? (w.status as BookingStatus) : 'confirmed')}>{editing ? t('common.save') : t('bookings.saveConfirm')}</Button>
              {!editing && <Button loading={m.isPending} onClick={() => void submit('confirmed', true)}>{t('bookings.saveAndHawala')}</Button>}
            </div>
          </form>
        )}
      </QueryBoundary>
    </>
  )
}
