import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { bookingService } from '@/services/bookings.service'
import { useAuth } from '@/stores/auth.store'
import { PageHeader, QueryBoundary, SectionCard } from '@/components/ui'
import { BookingDetailPanel } from './BookingDetailPanel'

/** Opening another hotel's booking id yields a "forbidden" error from the service layer, shown as an unauthorized state. */
export function BookingDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const tenantId = useAuth((s) => s.user?.tenantId)
  const q = useQuery({ queryKey: ['booking', tenantId, id], queryFn: () => bookingService.getBooking(id), enabled: !!tenantId })
  return (
    <>
      <PageHeader title={t('bookings.details')} breadcrumbs={[{ label: t('nav.bookings'), to: '/hotel/bookings' }, { label: q.data?.reference ?? '…' }]} />
      <QueryBoundary queries={[q]}>{q.data && <SectionCard title={q.data.clientName} className="max-w-2xl"><BookingDetailPanel booking={q.data} onChanged={() => void q.refetch()} /></SectionCard>}</QueryBoundary>
    </>
  )
}
