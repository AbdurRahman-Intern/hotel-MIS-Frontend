import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Building2 } from 'lucide-react'
import { hotelService } from '@/services/hotels.service'
import { useOwnHotel } from '@/hooks/useOwnHotel'
import { Button, Field, Input, PageHeader, QueryBoundary, SectionCard, Select, Textarea } from '@/components/ui'

const schema = z.object({
  name: z.string().trim().min(2, 'validation.required'),
  address: z.string().trim(),
  phone: z.string().trim().min(7, 'validation.phone'),
  contactEmail: z.string().trim().email('validation.email'),
  currency: z.enum(['AFN', 'USD', 'EUR']),
  dateFormat: z.enum(['dd MMM yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd']),
})
type Values = z.infer<typeof schema>

/** Saves to the mock API via hotelService.updateOwnHotel; tenant comes from the session, never from the form. */
export function HotelSettingsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const q = useOwnHotel()
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    const h = q.data
    if (h) reset({ name: h.name, address: h.address, phone: h.phone, contactEmail: h.contactEmail, currency: h.currency as Values['currency'], dateFormat: h.dateFormat as Values['dateFormat'] })
  }, [q.data, reset])

  const m = useMutation({
    mutationFn: (v: Values) => hotelService.updateOwnHotel(v),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['own-hotel'] }); toast.success(t('settings.saved')) },
    onError: () => toast.error(t('errors.generic')),
  })

  return (
    <>
      <PageHeader title={t('nav.settings')} subtitle={t('settings.subtitle')} />
      <QueryBoundary queries={[q]}>
        <form onSubmit={handleSubmit((v) => m.mutate(v))} className="grid max-w-4xl gap-5 lg:grid-cols-3" noValidate>
          <SectionCard title={t('settings.logo')} className="h-fit">
            <div className="grid place-items-center gap-2 rounded-lg border border-dashed border-line bg-slate-50 p-6 text-center text-sm text-muted">
              <span className="grid size-16 place-items-center rounded-2xl bg-white text-brand-600 ring-1 ring-line"><Building2 className="size-8" /></span>
              {t('settings.logoPlaceholder')}
            </div>
          </SectionCard>
          <SectionCard title={t('settings.hotelInfo')} className="lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('settings.hotelName')} required error={errors.name?.message}><Input {...register('name')} /></Field>
              <Field label={t('common.phone')} required error={errors.phone?.message}><Input dir="ltr" {...register('phone')} /></Field>
              <Field label={t('settings.contactEmail')} required error={errors.contactEmail?.message}><Input dir="ltr" type="email" {...register('contactEmail')} /></Field>
              <Field label={t('settings.currency')} required hint={t('settings.currencyHint')}>
                <Select {...register('currency')}><option value="AFN">AFN</option><option value="USD">USD</option><option value="EUR">EUR</option></Select>
              </Field>
              <Field label={t('settings.dateFormat')} required hint={t('settings.dateFormatHint')}>
                <Select {...register('dateFormat')}><option value="dd MMM yyyy">28 Oct 2026</option><option value="dd/MM/yyyy">28/10/2026</option><option value="yyyy-MM-dd">2026-10-28</option></Select>
              </Field>
              <div className="sm:col-span-2"><Field label={t('common.address')}><Textarea rows={2} {...register('address')} /></Field></div>
            </div>
            <div className="mt-5 flex justify-end"><Button type="submit" loading={m.isPending} disabled={!isDirty}>{t('common.save')}</Button></div>
          </SectionCard>
        </form>
      </QueryBoundary>
    </>
  )
}
