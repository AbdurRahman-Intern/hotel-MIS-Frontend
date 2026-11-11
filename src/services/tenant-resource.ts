import { api, AppError } from '@/lib/axios'
import { requireTenantId } from '@/stores/auth.store'

/**
 * tenant-resource.ts  -  ready-made list / get / create / update / remove for one API collection.
 *
 * Almost every service (halls, menus, bookings, employees ...) is plain CRUD, so they all call
 * tenantResource('halls', 'hall') instead of repeating the same Axios code.
 *
 * TWO MODES (same idea as auth.service.ts)
 *   LARAVEL (default)  The server does the security. It limits every query to the logged-in hotel, creates the
 *                      id, and answers 404 for another hotel's record. The browser sends NO tenantId.
 *   DEMO               GitHub Pages demo with no server. The browser plays the server's role and filters
 *                      by tenantId itself (the old prototype behaviour).
 */

/** True on the GitHub Pages demo (VITE_DEMO_MODE=true). */
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

/** Every record has an id. In demo mode it also carries the hotel's tenantId. */
interface Owned { id: string; tenantId: string }

/**
 * Makes a unique id like "bk-lq3x9a2f". DEMO MODE ONLY: Laravel creates real ids (ULIDs) itself.
 * @param prefix  short label for readability, e.g. 'bk' for bookings
 */
export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Builds the five standard operations for one collection.
 *
 * @param path      API collection name, e.g. 'bookings' -> GET /bookings
 * @param idPrefix  prefix for demo-mode ids (ignored with Laravel)
 */
export function tenantResource<T extends Owned>(path: string, idPrefix: string) {
  /** GET /path  ->  all records of the logged-in hotel. */
  const list = async (): Promise<T[]> => {
    if (!DEMO) {
      const { data } = await api.get<T[]>(`/${path}`)
      return data // Laravel already returned only this hotel's rows
    }
    const tenantId = requireTenantId()
    const { data } = await api.get<T[]>(`/${path}`, { params: { tenantId } })
    // Demo adapter: second filter in case the query parameter was ignored.
    return data.filter((r) => r.tenantId === tenantId)
  }

  /** GET /path/{id}  ->  one record. Laravel answers 404 if it belongs to another hotel. */
  const get = async (id: string): Promise<T> => {
    if (!DEMO) {
      const { data } = await api.get<T>(`/${path}/${id}`)
      return data
    }
    const tenantId = requireTenantId()
    const { data } = await api.get<T>(`/${path}/${id}`)
    if (data.tenantId !== tenantId) throw new AppError('forbidden', 'Record belongs to another hotel')
    return data
  }

  /** POST /path  ->  creates a record and returns it (with its new id). */
  const create = async (input: Omit<T, 'id' | 'tenantId'>): Promise<T> => {
    if (!DEMO) {
      // No id and no tenantId: the server decides both. Unknown fields are ignored by Laravel's validation.
      const { data } = await api.post<T>(`/${path}`, input)
      return data
    }
    const tenantId = requireTenantId()
    const { data } = await api.post<T>(`/${path}`, { ...input, id: newId(idPrefix), tenantId })
    return data
  }

  /** PATCH /path/{id}  ->  changes only the fields you pass. id and tenantId can never be changed. */
  const update = async (id: string, patch: Partial<Omit<T, 'id' | 'tenantId'>>): Promise<T> => {
    const { tenantId: _t, id: _i, ...safe } = patch as Partial<T>
    void _t; void _i
    if (!DEMO) {
      const { data } = await api.patch<T>(`/${path}/${id}`, safe)
      return data
    }
    await get(id) // demo: check ownership first
    const { data } = await api.patch<T>(`/${path}/${id}`, safe)
    return data
  }

  /** DELETE /path/{id}. */
  const remove = async (id: string): Promise<void> => {
    if (!DEMO) {
      await api.delete(`/${path}/${id}`)
      return
    }
    await get(id) // demo: check ownership first
    await api.delete(`/${path}/${id}`)
  }

  return { list, get, create, update, remove }
}