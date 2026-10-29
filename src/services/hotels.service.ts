import { api, AppError } from '@/lib/axios'
import { requireTenantId, useAuth } from '@/stores/auth.store'
import { newId } from './tenant-resource'
import type { ActivityLog, Hotel, HotelStatus, Plan, PlatformStats, User } from '@/types'

function assertSuperAdmin() {
  if (useAuth.getState().user?.role !== 'super_admin') throw new AppError('forbidden', 'Super admin only')
}

type UserRecord = User & { passwordHash: string }
export type NewHotelInput = Pick<Hotel, 'name' | 'slug' | 'ownerName' | 'ownerEmail' | 'phone' | 'address' | 'planId' | 'currency'>

export const hotelService = {
  // ----- Super Admin (platform) -----
  async getHotels(): Promise<Hotel[]> {
    assertSuperAdmin()
    const { data } = await api.get<Hotel[]>('/hotels')
    return data
  },
  async getHotel(id: string): Promise<Hotel> {
    assertSuperAdmin()
    const { data } = await api.get<Hotel>(`/hotels/${id}`)
    return data
  },
  async createHotel(input: NewHotelInput): Promise<Hotel> {
    assertSuperAdmin()
    const { data: existing } = await api.get<Hotel[]>('/hotels', { params: { slug: input.slug } })
    if (existing.length) throw new AppError('validation', 'slug_taken')
    const { data: emailTaken } = await api.get<User[]>('/users', { params: { email: input.ownerEmail.toLowerCase() } })
    if (emailTaken.length) throw new AppError('validation', 'email_taken')
    const hotel: Hotel = {
      ...input, id: newId('hotel'), logoUrl: null, status: 'active', registeredAt: new Date().toISOString().slice(0, 10),
      dateFormat: 'dd MMM yyyy', contactEmail: input.ownerEmail,
    }
    const { data } = await api.post<Hotel>('/hotels', hotel)
    // Mock owner account. TODO(laravel): create owner user + send invitation / password-reset email.
    // Demo password hash below is SHA-256("Demo@123456") — prototype only.
    const owner: UserRecord = {
      id: newId('user'), name: input.ownerName, email: input.ownerEmail.toLowerCase(), role: 'hotel_owner', tenantId: data.id,
      passwordHash: await demoHash(),
    }
    await api.post('/users', owner)
    await api.post('/activity', { id: newId('act'), date: new Date().toISOString(), message: `New hotel registered: ${data.name}` })
    return data
  },
  async updateHotel(id: string, patch: Partial<Omit<Hotel, 'id'>>): Promise<Hotel> {
    assertSuperAdmin()
    const { data } = await api.patch<Hotel>(`/hotels/${id}`, patch)
    return data
  },
  async setStatus(id: string, status: HotelStatus): Promise<Hotel> {
    return hotelService.updateHotel(id, { status })
  },
  async getUsers(): Promise<User[]> {
    assertSuperAdmin()
    const { data } = await api.get<UserRecord[]>('/users')
    return data.map(({ passwordHash: _p, ...u }) => { void _p; return u })
  },
  async getPlans(): Promise<Plan[]> {
    const { data } = await api.get<Plan[]>('/plans')
    return data
  },
  async getPlatformStats(): Promise<PlatformStats> {
    assertSuperAdmin()
    const [hotels, users, plans, activity] = await Promise.all([
      api.get<Hotel[]>('/hotels'), api.get<User[]>('/users'), api.get<Plan[]>('/plans'), api.get<ActivityLog[]>('/activity'),
    ])
    const hs = hotels.data
    const byMonth = new Map<string, number>()
    hs.forEach((h) => byMonth.set(h.registeredAt.slice(0, 7), (byMonth.get(h.registeredAt.slice(0, 7)) ?? 0) + 1))
    let cumulative = 0
    const growth = Array.from({ length: 10 }, (_, i) => {
      const key = `2026-${String(i + 1).padStart(2, '0')}`
      cumulative += byMonth.get(key) ?? 0
      return { month: key, hotels: cumulative }
    })
    return {
      totalHotels: hs.length,
      activeHotels: hs.filter((h) => h.status === 'active').length,
      suspendedHotels: hs.filter((h) => h.status === 'suspended').length,
      totalUsers: users.data.length,
      recentHotels: [...hs].sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)).slice(0, 5),
      growth,
      planDistribution: plans.data.map((p) => ({ plan: p.name, count: hs.filter((h) => h.planId === p.id).length })),
      activity: [...activity.data].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    }
  },

  // ----- Hotel owner: own workspace only -----
  async getOwnHotel(): Promise<Hotel> {
    const tenantId = requireTenantId()
    const { data } = await api.get<Hotel>(`/hotels/${tenantId}`)
    return data
  },
  async updateOwnHotel(patch: Partial<Pick<Hotel, 'name' | 'address' | 'phone' | 'contactEmail' | 'currency' | 'dateFormat' | 'logoUrl'>>): Promise<Hotel> {
    const tenantId = requireTenantId()
    const { data } = await api.patch<Hotel>(`/hotels/${tenantId}`, patch)
    return data
  },
}

async function demoHash() {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('Demo@123456'))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}
