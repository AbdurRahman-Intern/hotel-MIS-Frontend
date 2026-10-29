import { api, AppError } from '@/lib/axios'
import type { Hotel, User } from '@/types'

type UserRecord = User & { passwordHash: string }

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const strip = ({ passwordHash: _p, ...user }: UserRecord): User => {
  void _p
  return user
}

export const authService = {
  /**
   * PROTOTYPE ONLY. Compares a SHA-256 of the demo password against the seeded record, in the browser.
   * This is NOT production authentication. TODO(laravel): POST /auth/login (Sanctum), server-side hashing, rate limiting.
   */
  async login(email: string, password: string): Promise<User> {
    const { data } = await api.get<UserRecord[]>('/users', { params: { email: email.trim().toLowerCase() } })
    const rec = data[0]
    if (!rec || rec.passwordHash !== (await sha256(password))) throw new AppError('forbidden', 'invalid_credentials')
    if (rec.role === 'hotel_owner' && rec.tenantId) {
      const { data: hotel } = await api.get<Hotel>(`/hotels/${rec.tenantId}`)
      if (hotel.status === 'suspended') throw new AppError('forbidden', 'hotel_suspended')
    }
    return strip(rec)
  },

  /** Re-reads the user from the API so role/tenant in browser storage is never trusted. */
  async restore(userId: string): Promise<User | null> {
    try {
      const { data } = await api.get<UserRecord>(`/users/${userId}`)
      if (data.role === 'hotel_owner' && data.tenantId) {
        const { data: hotel } = await api.get<Hotel>(`/hotels/${data.tenantId}`)
        if (hotel.status === 'suspended') return null
      }
      return strip(data)
    } catch (e) {
      if (e instanceof AppError && e.code === 'network') throw e
      return null
    }
  },
}
