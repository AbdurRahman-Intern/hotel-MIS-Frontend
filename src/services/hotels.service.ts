import { api, AppError } from '@/lib/axios'
import { requireTenantId, useAuth } from '@/stores/auth.store'
import { newId } from './tenant-resource'
import type { ActivityLog, Hotel, HotelStatus, Plan, PlatformStats, User } from '@/types'

/**
 * hotels.service.ts  -  everything about HOTELS (tenants) and the platform.
 *
 * TWO KINDS OF CALLERS
 *   1. SUPER ADMIN (platform owner)   getHotels, getHotel, createHotel, updateHotel, setStatus, getUsers,
 *                                     getPlatformStats. Manage ALL hotels.
 *   2. HOTEL OWNER                    getOwnHotel, updateOwnHotel. Only THEIR hotel.
 *   (getPlans is for both: the hotel form needs the list of plans.)
 *
 * TWO MODES (same idea as auth.service.ts)
 *   LARAVEL (default)  the server does the real work and the real security.
 *   DEMO               GitHub Pages: no server, so the browser plays the server's role with the demo data.
 *
 * Laravel endpoints used (hotel-saas-api/routes/api.php):
 *   GET/POST /hotels         GET/PATCH /hotels/{id}
 *   GET /users               GET /plans
 *   GET /platform/stats      GET/PATCH /my-hotel
 */

/** True on the GitHub Pages demo (VITE_DEMO_MODE=true). */
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

/**
 * UX CHECK ONLY. Stops a hotel owner from even trying a Super Admin call and gives a clear error at once.
 * It is NOT security: anyone can bypass the browser. The real lock is the `role:super_admin` middleware in Laravel.
 *
 * @throws AppError('forbidden') when the logged-in user is not a super admin
 */
function assertSuperAdmin() {
  if (useAuth.getState().user?.role !== 'super_admin') throw new AppError('forbidden', 'Super admin only')
}

/** A user as stored in the DEMO data. It carries a password hash that the real API never sends. */
type UserRecord = User & { passwordHash: string }

/**
 * What the "register hotel" form sends.
 * `slug` is only used by the demo. Laravel makes its own unique slug from the hotel name.
 * `ownerPassword` is optional: when it is missing, Laravel generates a temporary one (see createHotel).
 */
export type NewHotelInput = Pick<Hotel, 'name' | 'slug' | 'ownerName' | 'ownerEmail' | 'phone' | 'address' | 'planId' | 'currency'> & {
  ownerPassword?: string
}

/** The result of creating a hotel. `temporaryPassword` is present only when the server generated one. */
export type CreatedHotel = Hotel & { temporaryPassword?: string }

export const hotelService = {
  // ======================================================================================
  // SUPER ADMIN (platform)
  // ======================================================================================

  /**
   * All hotels on the platform, for the "Hotels" table.
   * Laravel: GET /hotels
   */
  async getHotels(): Promise<Hotel[]> {
    assertSuperAdmin()
    const { data } = await api.get<Hotel[]>('/hotels')
    return data
  },

  /**
   * One hotel by id, for its detail page.
   * Laravel: GET /hotels/{id}  (404 if it does not exist)
   *
   * @param id  the hotel's id
   */
  async getHotel(id: string): Promise<Hotel> {
    assertSuperAdmin()
    const { data } = await api.get<Hotel>(`/hotels/${id}`)
    return data
  },

  /**
   * Register a new hotel AND create the owner's login account.
   *
   * LARAVEL (default): POST /hotels. In ONE database transaction the server:
   *   - creates the hotel with a unique slug,
   *   - creates the owner user (hotel_owner) with a hashed password,
   *   - writes "New hotel registered" to the activity feed.
   * If the form sent no password, the server generates one and returns it ONCE as `temporaryPassword`.
   * The Super Admin has to give it to the owner. It can never be read again.
   *
   * DEMO: the browser checks for duplicates itself and creates the records in the demo data.
   *
   * @throws AppError('validation', 'email_taken')  the owner's e-mail already has an account
   * @throws AppError('validation', 'slug_taken')   (demo only) the slug is already used
   */
  async createHotel(input: NewHotelInput): Promise<CreatedHotel> {
    assertSuperAdmin()

    if (!DEMO) {
      try {
        const { data } = await api.post<CreatedHotel>('/hotels', input)
        return data
      } catch (e) {
        // Laravel answers a duplicate e-mail with 422 and an error on the field "ownerEmail".
        // The form knows the code 'email_taken' and shows its own translated message.
        if (e instanceof AppError && e.code === 'validation' && e.fields?.ownerEmail) {
          throw new AppError('validation', 'email_taken', e.fields)
        }
        throw e
      }
    }

    // ---- DEMO MODE ONLY -------------------------------------------------------------
    const { data: existing } = await api.get<Hotel[]>('/hotels', { params: { slug: input.slug } })
    if (existing.length) throw new AppError('validation', 'slug_taken')
    const { data: emailTaken } = await api.get<User[]>('/users', { params: { email: input.ownerEmail.toLowerCase() } })
    if (emailTaken.length) throw new AppError('validation', 'email_taken')

    const hotel: Hotel = {
      ...input, id: newId('hotel'), logoUrl: null, status: 'active', registeredAt: new Date().toISOString().slice(0, 10),
      dateFormat: 'dd MMM yyyy', contactEmail: input.ownerEmail,
    }
    const { data } = await api.post<Hotel>('/hotels', hotel)

    // Mock owner account. The password is always "Demo@123456" in the demo (stored as a SHA-256 hash).
    const owner: UserRecord = {
      id: newId('user'), name: input.ownerName, email: input.ownerEmail.toLowerCase(), role: 'hotel_owner', tenantId: data.id,
      passwordHash: await demoHash(),
    }
    await api.post('/users', owner)
    await api.post('/activity', { id: newId('act'), date: new Date().toISOString(), message: `New hotel registered: ${data.name}` })
    return data
  },

  /**
   * Change some fields of a hotel (edit form).
   * Laravel: PATCH /hotels/{id}. Only the fields you send change. The owner's e-mail, the id and the
   * registration date can not be changed (the server ignores them).
   *
   * @param id     the hotel's id
   * @param patch  the fields to change
   */
  async updateHotel(id: string, patch: Partial<Omit<Hotel, 'id'>>): Promise<Hotel> {
    assertSuperAdmin()
    const { data } = await api.patch<Hotel>(`/hotels/${id}`, patch)
    return data
  },

  /**
   * Suspend or re-activate a hotel.
   * A suspended hotel's owner can not log in, and an owner who is already logged in is blocked on their
   * very next request (the `hotel.active` middleware in Laravel checks every time).
   *
   * @param id      the hotel's id
   * @param status  'active' or 'suspended'
   */
  async setStatus(id: string, status: HotelStatus): Promise<Hotel> {
    return hotelService.updateHotel(id, { status })
  },

  /**
   * Every user account of the platform, for the "Users" page.
   * Laravel: GET /users. It never contains password data. (The demo data does, so the demo strips it.)
   */
  async getUsers(): Promise<User[]> {
    assertSuperAdmin()
    const { data } = await api.get<UserRecord[]>('/users')
    if (!DEMO) return data // Laravel's UserResource only sends safe fields
    return data.map(({ passwordHash: _p, ...u }) => { void _p; return u })
  },

  /**
   * The subscription plans (starter / professional / enterprise) for dropdowns. Both roles may call it.
   * Laravel: GET /plans
   */
  async getPlans(): Promise<Plan[]> {
    const { data } = await api.get<Plan[]>('/plans')
    return data
  },

  /**
   * All numbers of the Super Admin dashboard: hotel counts, newest hotels, growth chart, plan chart, activity.
   *
   * LARAVEL (default): GET /platform/stats. The server counts everything in the database
   *   (PlatformController::stats).
   * DEMO: the browser loads the lists and counts them itself.
   */
  async getPlatformStats(): Promise<PlatformStats> {
    assertSuperAdmin()

    if (!DEMO) {
      const { data } = await api.get<PlatformStats>('/platform/stats')
      return data
    }

    // ---- DEMO MODE ONLY -------------------------------------------------------------
    const [hotels, users, plans, activity] = await Promise.all([
      api.get<Hotel[]>('/hotels'), api.get<User[]>('/users'), api.get<Plan[]>('/plans'), api.get<ActivityLog[]>('/activity'),
    ])
    const hs = hotels.data

    // Growth chart: how many hotels existed at the end of each month (cumulative).
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

  // ======================================================================================
  // HOTEL OWNER: their own hotel only
  // ======================================================================================

  /**
   * The logged-in owner's own hotel (Settings page, header, currency for money formatting).
   * Laravel: GET /my-hotel. The server finds the hotel from the login token, so an owner can never read
   * another hotel this way.
   */
  async getOwnHotel(): Promise<Hotel> {
    if (!DEMO) {
      const { data } = await api.get<Hotel>('/my-hotel')
      return data
    }
    const tenantId = requireTenantId()
    const { data } = await api.get<Hotel>(`/hotels/${tenantId}`)
    return data
  },

  /**
   * Save the owner's hotel settings (name, contact details, currency, date format).
   * Laravel: PATCH /my-hotel. Owners can NOT change their plan or status; only the Super Admin can.
   * TODO: `logoUrl` is not saved by Laravel yet (it needs a file upload endpoint).
   *
   * @param patch  the settings to change
   */
  async updateOwnHotel(patch: Partial<Pick<Hotel, 'name' | 'address' | 'phone' | 'contactEmail' | 'currency' | 'dateFormat' | 'logoUrl'>>): Promise<Hotel> {
    if (!DEMO) {
      const { data } = await api.patch<Hotel>('/my-hotel', patch)
      return data
    }
    const tenantId = requireTenantId()
    const { data } = await api.patch<Hotel>(`/hotels/${tenantId}`, patch)
    return data
  },
}

/**
 * DEMO MODE ONLY. SHA-256 hash (as hex text) of the demo password "Demo@123456".
 * The real system never works like this: Laravel hashes passwords with bcrypt on the server.
 */
async function demoHash() {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('Demo@123456'))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}