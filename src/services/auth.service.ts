import { api, AppError } from '@/lib/axios'
import { tokenStore } from '@/lib/token'
import type { User } from '@/types'

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
    if (!tokenStore.get()) return null // never logged in on this browser

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
    try {
      await api.post('/auth/logout')
    } catch {
      /* the token may already be invalid: nothing more to do */
    }
    tokenStore.clear()
  },
}