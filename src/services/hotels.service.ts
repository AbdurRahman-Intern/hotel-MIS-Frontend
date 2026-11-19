import { api, AppError } from '@/lib/axios'
import { requireTenantId, useAuth } from '@/stores/auth.store'
import { newId } from './tenant-resource'
import type { ActivityLog, Hotel, HotelStatus, Plan, PlatformSettings, PlatformStats, User } from '@/types'

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
 *   POST /plans              PATCH/DELETE /plans/{id}
 *   GET/PATCH /platform/settings
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

/** What the plan form sends. The id is made by the server (Laravel) or by createPlan() (demo). */
export type PlanInput = Pick<Plan, 'name' | 'priceMonthly' | 'maxUsers'>

/** Where the DEMO keeps the platform settings (the demo database has no table for them). */
const DEMO_SETTINGS_KEY = 'hotelsaas.demo.platformSettings'

/** Settings used until the Super Admin saves something. They match PlatformSetting::DEFAULTS in Laravel. */
const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: 'Hotel SaaS', supportEmail: '', supportPhone: '', defaultCurrency: 'AFN', defaultPlanId: 'starter', trialDays: 14,
}

/** "Gold Plus" -> "gold-plus". DEMO ONLY: Laravel makes plan ids itself. */
const slugify = (text: string) => text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'plan'

/** What the "edit owner" form sends. */
export type OwnerInput = { ownerName: string; ownerEmail: string }

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
   * Create a subscription plan (Super Admin).
   * Laravel: POST /plans  { name, priceMonthly, maxUsers }. The server makes the id from the name ("Gold Plus" -> "gold-plus").
   * Demo: the browser checks the name and makes the id itself.
   *
   * @throws AppError('validation', 'plan_name_taken')  another plan already has this name
   */
  async createPlan(input: PlanInput): Promise<Plan> {
    assertSuperAdmin()

    if (!DEMO) {
      try {
        const { data } = await api.post<Plan>('/plans', input)
        return data
      } catch (e) {
        return rethrowPlanNameTaken(e)
      }
    }

    // ---- DEMO MODE ONLY -------------------------------------------------------------
    const { data: plans } = await api.get<Plan[]>('/plans')
    if (plans.some((p) => p.name.toLowerCase() === input.name.trim().toLowerCase())) throw new AppError('validation', 'plan_name_taken')
    let id = slugify(input.name)
    for (let n = 2; plans.some((p) => p.id === id); n++) id = `${slugify(input.name)}-${n}`
    const { data } = await api.post<Plan>('/plans', { ...input, name: input.name.trim(), id })
    return data
  },

  /**
   * Change a plan's name, price or user limit (Super Admin). The id never changes, because hotels point to it.
   * Laravel: PATCH /plans/{id}
   *
   * @param id     the plan's id
   * @param patch  the fields to change
   * @throws AppError('validation', 'plan_name_taken')
   */
  async updatePlan(id: string, patch: Partial<PlanInput>): Promise<Plan> {
    assertSuperAdmin()

    if (!DEMO) {
      try {
        const { data } = await api.patch<Plan>(`/plans/${id}`, patch)
        return data
      } catch (e) {
        return rethrowPlanNameTaken(e)
      }
    }

    // ---- DEMO MODE ONLY -------------------------------------------------------------
    if (patch.name) {
      const { data: plans } = await api.get<Plan[]>('/plans')
      if (plans.some((p) => p.id !== id && p.name.toLowerCase() === patch.name!.trim().toLowerCase())) throw new AppError('validation', 'plan_name_taken')
    }
    const { data } = await api.patch<Plan>(`/plans/${id}`, patch)
    return data
  },

  /**
   * Delete a plan (Super Admin). Refused while any hotel is on it, because those hotels would lose their plan.
   * Laravel: DELETE /plans/{id} (it also refuses to delete the default plan from the platform settings).
   *
   * @param id  the plan's id
   * @throws AppError('validation', 'plan_in_use')
   */
  async deletePlan(id: string): Promise<void> {
    assertSuperAdmin()

    if (!DEMO) {
      try {
        await api.delete(`/plans/${id}`)
        return
      } catch (e) {
        // Laravel answers with 422 and an error on the field "plan" (see PlanController::destroy).
        if (e instanceof AppError && e.code === 'validation' && e.fields?.plan) throw new AppError('validation', 'plan_in_use', e.fields)
        throw e
      }
    }

    // ---- DEMO MODE ONLY -------------------------------------------------------------
    const { data: hotels } = await api.get<Hotel[]>('/hotels', { params: { planId: id } })
    if (hotels.length) throw new AppError('validation', 'plan_in_use')
    await api.delete(`/plans/${id}`)
  },

  /**
   * The platform settings (name, support contacts, defaults) for the Super Admin "Settings" page.
   * Laravel: GET /platform/settings. Settings that were never saved come back with their default value.
   * Demo: kept in the browser's localStorage.
   */
  async getPlatformSettings(): Promise<PlatformSettings> {
    assertSuperAdmin()

    if (!DEMO) {
      const { data } = await api.get<PlatformSettings>('/platform/settings')
      return data
    }
    return readDemoSettings()
  },

  /**
   * Save platform settings. Only the fields you pass change.
   * Laravel: PATCH /platform/settings. It answers with ALL settings, so the form can refresh from the result.
   *
   * @param patch  the settings to change
   */
  async updatePlatformSettings(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
    assertSuperAdmin()

    if (!DEMO) {
      const { data } = await api.patch<PlatformSettings>('/platform/settings', patch)
      return data
    }

    // ---- DEMO MODE ONLY -------------------------------------------------------------
    const merged = { ...readDemoSettings(), ...patch }
    try { localStorage.setItem(DEMO_SETTINGS_KEY, JSON.stringify(merged)) } catch { /* storage blocked: the change lasts until reload */ }
    return merged
  },

  /**
   * PERMANENTLY delete a hotel, its owner login and ALL its data. Only a suspended hotel can be deleted:
   * suspend first, delete after. This forces a deliberate two-step.
   * Laravel: DELETE /hotels/{id}. In ONE transaction the server deletes the owner users, then the hotel;
   * the database removes the hotel's bookings, stock, staff and finances by itself (ON DELETE CASCADE).
   * Demo: removes the hotel and its users (the hotel's other demo records are left behind, harmlessly).
   *
   * @param id  the hotel's id
   * @throws AppError('validation', 'hotel_not_suspended')  the hotel is still active
   */
  async deleteHotel(id: string): Promise<void> {
    assertSuperAdmin()

    if (!DEMO) {
      try {
        await api.delete(`/hotels/${id}`)
        return
      } catch (e) {
        // Laravel answers 422 with an error on the field "hotel" when the hotel is still active.
        if (e instanceof AppError && e.code === 'validation' && e.fields?.hotel) throw new AppError('validation', 'hotel_not_suspended', e.fields)
        throw e
      }
    }

    // ---- DEMO MODE ONLY -------------------------------------------------------------
    const { data: hotel } = await api.get<Hotel>(`/hotels/${id}`)
    if (hotel.status !== 'suspended') throw new AppError('validation', 'hotel_not_suspended')
    const { data: users } = await api.get<UserRecord[]>('/users', { params: { tenantId: id } })
    for (const u of users) await api.delete(`/users/${u.id}`)
    await api.delete(`/hotels/${id}`)
    await api.post('/activity', { id: newId('act'), date: new Date().toISOString(), message: `Hotel deleted: ${hotel.name}` })
  },

  /**
   * Change the owner's name and/or LOGIN e-mail (Super Admin).
   * Laravel: PATCH /hotels/{id}/owner. The server updates the user AND the hotel record together, so the two never differ.
   * Changing the e-mail changes how the owner logs in, so tell them.
   *
   * @param id     the hotel's id
   * @param input  the new name and e-mail
   * @throws AppError('validation', 'email_taken')  another account already uses this e-mail
   */
  async updateOwner(id: string, input: OwnerInput): Promise<Hotel> {
    assertSuperAdmin()
    const email = input.ownerEmail.trim().toLowerCase()

    if (!DEMO) {
      try {
        const { data } = await api.patch<Hotel>(`/hotels/${id}/owner`, { ownerName: input.ownerName.trim(), ownerEmail: email })
        return data
      } catch (e) {
        if (e instanceof AppError && e.code === 'validation' && e.fields?.ownerEmail) throw new AppError('validation', 'email_taken', e.fields)
        throw e
      }
    }

    // ---- DEMO MODE ONLY -------------------------------------------------------------
    const { data: hotel } = await api.get<Hotel>(`/hotels/${id}`)
    const { data: owners } = await api.get<UserRecord[]>('/users', { params: { email: hotel.ownerEmail } })
    const owner = owners[0]
    if (email !== hotel.ownerEmail) {
      const { data: taken } = await api.get<User[]>('/users', { params: { email } })
      if (taken.length) throw new AppError('validation', 'email_taken')
    }
    if (owner) await api.patch(`/users/${owner.id}`, { name: input.ownerName.trim(), email })
    const { data } = await api.patch<Hotel>(`/hotels/${id}`, { ownerName: input.ownerName.trim(), ownerEmail: email })
    return data
  },

  /**
   * Give the owner a new temporary password (they forgot theirs). Super Admin only.
   * Laravel: POST /hotels/{id}/owner/reset-password. The server sets a random password, logs the owner out everywhere,
   * and returns the password ONCE. It can never be read again, so copy it and hand it over.
   *
   * @param id  the hotel's id
   * @returns the new temporary password
   */
  async resetOwnerPassword(id: string): Promise<string> {
    assertSuperAdmin()

    if (!DEMO) {
      const { data } = await api.post<{ temporaryPassword: string }>(`/hotels/${id}/owner/reset-password`)
      return data.temporaryPassword
    }

    // ---- DEMO MODE ONLY -------------------------------------------------------------
    const { data: hotel } = await api.get<Hotel>(`/hotels/${id}`)
    const { data: owners } = await api.get<UserRecord[]>('/users', { params: { email: hotel.ownerEmail } })
    if (!owners[0]) throw new AppError('not_found', 'Owner not found')
    const password = randomPassword()
    await api.patch(`/users/${owners[0].id}`, { passwordHash: await sha256(password) })
    return password
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

/** DEMO MODE ONLY. SHA-256 of a text, as hex. The real system never works like this: Laravel hashes passwords with bcrypt. */
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** DEMO MODE ONLY. The hash of the demo password "Demo@123456". */
const demoHash = () => sha256('Demo@123456')

/** DEMO MODE ONLY. A random 12-character password (letters and digits, no look-alike characters). */
function randomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (n) => chars[n % chars.length]).join('')
}

/**
 * Laravel answers a duplicate plan name with 422 and an error on the field "name".
 * The plan form knows the code 'plan_name_taken' and shows its own translated message.
 * Always throws.
 */
function rethrowPlanNameTaken(e: unknown): never {
  if (e instanceof AppError && e.code === 'validation' && e.fields?.name) throw new AppError('validation', 'plan_name_taken', e.fields)
  throw e
}

/** DEMO MODE ONLY. Saved settings from localStorage, filled up with the defaults. */
function readDemoSettings(): PlatformSettings {
  try {
    const raw = localStorage.getItem(DEMO_SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<PlatformSettings>) }
  } catch { /* corrupt or blocked storage: use the defaults */ }
  return DEFAULT_SETTINGS
}
