import { useQuery } from '@tanstack/react-query'
import { hotelService } from '@/services/hotels.service'
import { useAuth } from '@/stores/auth.store'

/** The signed-in owner's own hotel. Tenant comes from the session, and is part of the cache key. */
export function useOwnHotel() {
  const user = useAuth((s) => s.user)
  return useQuery({ queryKey: ['own-hotel', user?.tenantId], queryFn: hotelService.getOwnHotel, enabled: user?.role === 'hotel_owner', staleTime: 60_000 })
}
