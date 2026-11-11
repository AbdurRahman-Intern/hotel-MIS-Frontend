/**
 * token.ts  -  keeps the Laravel Sanctum login token in the browser.
 *
 * WHAT IS THE TOKEN?
 *   After a successful login the API returns a long random string (the "token").
 *   We send it back on every request ("Authorization: Bearer <token>") so Laravel knows who we are.
 *
 * WHY ONLY THE TOKEN IS STORED
 *   The user's role and hotel are NOT stored here. They are re-read from the API (GET /auth/me)
 *   when the app starts, so editing localStorage by hand cannot turn a hotel owner into an admin.
 *
 * WHY try/catch EVERYWHERE
 *   localStorage can throw (private browsing, blocked cookies, storage full). The app must still work.
 */

/** The localStorage key under which the token is saved. Change it only if you also want to log everyone out. */
const KEY = 'hotel_saas_token'

export const tokenStore = {
  /** Returns the saved token, or null when the user is logged out (or storage is unavailable). */
  get: (): string | null => {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return null
    }
  },

  /** Saves the token after login. Called by authService.login(). */
  set: (token: string): void => {
    try {
      localStorage.setItem(KEY, token)
    } catch {
      /* storage blocked: the user simply has to log in again next time */
    }
  },

  /** Deletes the token. Called on logout and when the API says the token is no longer valid. */
  clear: (): void => {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* nothing to do */
    }
  },
}