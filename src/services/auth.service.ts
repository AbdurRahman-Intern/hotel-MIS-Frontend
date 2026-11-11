import { api, AppError } from '@/lib/axios'
import { tokenStore } from '@/lib/token'
import type { Hotel, User } from '@/types'

/** True on the GitHub Pages demo: there is no Laravel there, the data lives in the browser (see demo-adapter.ts). */
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

/** A user record as stored in the demo data. It includes a password hash, which the real API never sends. */
type DemoUserRecord = User & { passwordHash: string }

/** SHA-256 of a text, as hex. Demo mode only: compares the typed password with the demo record. */
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Removes the password hash so it never reaches the rest of the app. */
function stripHash({ passwordHash: _hash, ...user }: DemoUserRecord): User {
  void _hash
  return user
}

/**
 * DEMO ONLY (GitHub Pages). Checks the password in the browser against the demo data.
 * This is NOT real security. Real login is the Laravel endpoint below.
 */
async function demoLogin(email: string, password: string): Promise<User> {
  const { data } = await api.get<DemoUserRecord[]>('/users', { params: { email } })
  const record = data[0]
  if (!record || record.passwordHash !== (await sha256(password))) throw new AppError('forbidden', 'invalid_credentials')
  await assertHotelActive(record)
  tokenStore.set(record.id) // the demo has no real token, so we keep the user id to restore the session
  return stripHash(record)
}

/** DEMO ONLY. Throws 'hotel_suspended' for owners of suspended hotels (Laravel does this server-side). */
async function assertHotelActive(user: User): Promise<void> {
  if (user.role === 'hotel_owner' && user.tenantId) {
    const { data: hotel } = await api.get<Hotel>(`/hotels/${user.tenantId}`)
    if (hotel.status === 'suspended') throw new AppError('forbidden', 'hotel_suspended')
  }
}

/**
 * auth.service.ts  -  login, restore session, logout (talks to Laravel Sanctum).
 *
 * Laravel endpoints used (see hotel-saas-api/routes/api.php):
 *   POST /auth/login   {email, password}  ->  { token, user }
 *   GET  /auth/me                         ->  user
 *   POST /auth/logout                     ->  204
 *
 * SECURITY: passwords are checked ONLY on the server. The browser never sees a password hash.
 * Suspended-hotel checks also happen on the server (it answers HTTP 403 with code 'hotel_suspended').
 */
export const authService = {
  /**
   * Log in with e-mail and password.
   *
   * On success the token is saved (so later requests are authenticated) and the user is returned.
   *
   * Errors thrown (AppError):
   *   - forbidden / 'invalid_credentials'  wrong e-mail or password (Laravel answers 422)
   *   - forbidden / 'hotel_suspended'      the hotel was suspended by the Super Admin
   *   - network                            the API is unreachable
   *
   * @param email     typed e-mail (trimmed + lower-cased here)
   * @param password  typed password, sent over HTTPS in production
   */
  async login(email: string, password: string): Promise<User> {
    if (DEMO) return demoLogin(email.trim().toLowerCase(), password)

    try {
      const { data } = await api.post<{ token: string; user: User }>('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      })
      tokenStore.set(data.token)
      return data.user
    } catch (e) {
      // Laravel reports bad credentials as a 422 validation error on "email".
      // We translate it so the login page keeps showing its existing "invalid credentials" message.
      if (e instanceof AppError && e.code === 'validation') {
        throw new AppError('forbidden', 'invalid_credentials')
      }
      throw e // network / hotel_suspended / server: let the page decide what to show
    }
  },

  /**
   * Restore the session when the app starts (page refresh).
   *
   * Asks Laravel "who owns this token?" so role and hotel always come from the server and
   * can never be faked by editing the browser's storage.
   *
   * @param _userId  not used any more (the token identifies the user). Kept so App.tsx still compiles.
   * @returns the logged-in user, or null when there is no valid session.
   * @throws  AppError('network') when the API is down, so the UI can show "API unreachable"
   *          instead of silently logging the user out.
   */
  async restore(_userId?: string): Promise<User | null> {
    const saved = tokenStore.get()
    if (!saved) return null // never logged in on this browser

    if (DEMO) {
      // Demo: the saved "token" is the user id. Re-read the record so role/tenant are not trusted from storage.
      try {
        const { data } = await api.get<DemoUserRecord>(`/users/${saved}`)
        await assertHotelActive(data)
        return stripHash(data)
      } catch (e) {
        if (e instanceof AppError && e.code === 'network') throw e
        tokenStore.clear()
        return null
      }
    }

    try {
      const { data } = await api.get<User>('/auth/me')
      return data
    } catch (e) {
      if (e instanceof AppError && e.code === 'network') throw e
      tokenStore.clear() // token expired, revoked, or hotel suspended: start from the login page
      return null
    }
  },

  /**
   * Log out.
   *
   * Tells Laravel to delete this token (so a stolen copy stops working), then forgets it locally.
   * The local token is removed even if the API call fails.
   */
  async logout(): Promise<void> {
    if (DEMO) {
      tokenStore.clear() // nothing to tell a server in demo mode
      return
    }
    try {
      await api.post('/auth/logout')
    } catch {
      /* the token may already be invalid: nothing more to do */
    }
    tokenStore.clear()
  },
}