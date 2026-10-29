import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/stores/auth.store'
import type { Role } from '@/types'

export const homeFor = (role: Role) => (role === 'super_admin' ? '/super-admin/dashboard' : '/hotel/dashboard')

/**
 * Client-side guard for UX only. It is NOT a security boundary: a user controls their browser.
 * TODO(laravel): enforce auth, role and tenant on every API request server-side.
 */
export function RequireRole({ role }: { role: Role }) {
  const user = useAuth((s) => s.user)
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (user.role !== role) return <Navigate to="/unauthorized" replace />
  return <Outlet />
}

export function RedirectIfAuthed() {
  const user = useAuth((s) => s.user)
  if (user) return <Navigate to={homeFor(user.role)} replace />
  return <Outlet />
}
