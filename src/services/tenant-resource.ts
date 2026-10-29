import { api, AppError } from '@/lib/axios'
import { requireTenantId } from '@/stores/auth.store'

interface Owned { id: string; tenantId: string }

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Generic tenant-scoped CRUD. Tenant always comes from the authenticated session, never from forms or URLs.
 * TODO(laravel): replace with real endpoints; Laravel must scope every query by the authenticated user's tenant
 * (e.g. a global Eloquent scope) and return 404/403 for foreign records.
 */
export function tenantResource<T extends Owned>(path: string, idPrefix: string) {
  const list = async (): Promise<T[]> => {
    const tenantId = requireTenantId()
    const { data } = await api.get<T[]>(`/${path}`, { params: { tenantId } })
    // defensive second filter in case the API ignores the query param
    return data.filter((r) => r.tenantId === tenantId)
  }

  const get = async (id: string): Promise<T> => {
    const tenantId = requireTenantId()
    const { data } = await api.get<T>(`/${path}/${id}`)
    if (data.tenantId !== tenantId) throw new AppError('forbidden', 'Record belongs to another hotel')
    return data
  }

  const create = async (input: Omit<T, 'id' | 'tenantId'>): Promise<T> => {
    const tenantId = requireTenantId()
    const { data } = await api.post<T>(`/${path}`, { ...input, id: newId(idPrefix), tenantId })
    return data
  }

  const update = async (id: string, patch: Partial<Omit<T, 'id' | 'tenantId'>>): Promise<T> => {
    await get(id) // ownership check
    const { tenantId: _t, id: _i, ...safe } = patch as Partial<T>
    void _t; void _i
    const { data } = await api.patch<T>(`/${path}/${id}`, safe)
    return data
  }

  const remove = async (id: string): Promise<void> => {
    await get(id)
    await api.delete(`/${path}/${id}`)
  }

  return { list, get, create, update, remove }
}
