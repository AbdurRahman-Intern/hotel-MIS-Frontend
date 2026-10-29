import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

/**
 * Only the user id is persisted. On app boot the full user record (role + tenantId) is re-read from the API
 * (authService.restore), so editing role/tenantId in localStorage has no effect on what the UI renders.
 * PROTOTYPE ONLY: a browser user can still tamper with anything. Laravel must enforce auth, roles and tenants server-side.
 */
interface AuthState {
  userId: string | null
  user: User | null
  status: 'loading' | 'ready'
  setSession: (user: User) => void
  setReady: (user: User | null) => void
  logout: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      user: null,
      status: 'loading',
      setSession: (user) => set({ user, userId: user.id, status: 'ready' }),
      setReady: (user) => set({ user, userId: user ? user.id : null, status: 'ready' }),
      logout: () => set({ user: null, userId: null, status: 'ready' }),
    }),
    { name: 'hotelsaas.session', partialize: (s) => ({ userId: s.userId }) },
  ),
)

/** Returns the tenant of the authenticated hotel owner. The ONLY source of tenant context for data services. */
export function requireTenantId(): string {
  const u = useAuth.getState().user
  if (!u || u.role !== 'hotel_owner' || !u.tenantId) throw new Error('forbidden: no tenant context')
  return u.tenantId
}
