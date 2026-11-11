import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

/**
 * DEMO MODE (VITE_DEMO_MODE=true): answers the handful of JSON Server requests the app makes from a copy of
 * db.json kept in the visitor's localStorage. Used for static hosting (GitHub Pages) where no API server exists.
 * Each visitor gets a private copy; nothing is shared or sent anywhere. NOT a real backend and NOT secure.
 * Supports: GET list (equality filters from params), GET by id, POST, PATCH, PUT, DELETE.
 */
type Row = Record<string, unknown> & { id: string }
type Db = Record<string, Row[]>

const KEY = 'hotelsaas.demo.db.v1'
let cache: Db | null = null

async function load(): Promise<Db> {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) { cache = JSON.parse(raw) as Db; return cache }
  } catch { /* storage blocked or corrupt: fall back to the seed */ }
  cache = structuredClone((await import('../../db.json')).default) as unknown as Db
  return cache
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)) } catch { /* quota/private mode: keep in memory only */ }
}

/** Clears the visitor's demo data so the next load re-seeds from db.json. */
export function resetDemoData() {
  cache = null
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}

function respond(config: InternalAxiosRequestConfig, status: number, data: unknown): Promise<AxiosResponse> {
  const response: AxiosResponse = { data: structuredClone(data), status, statusText: String(status), headers: {}, config }
  if (status >= 200 && status < 300) return Promise.resolve(response)
  return Promise.reject(new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, null, response))
}

export const demoAdapter: AxiosAdapter = async (config) => {
  const db = await load()
  const method = (config.method ?? 'get').toLowerCase()
  const [collection, id] = (config.url ?? '').replace(/^\//, '').split('?')[0].split('/')
  const rows = db[collection]
  if (!rows) return respond(config, 404, {})
  const body = typeof config.data === 'string' && config.data ? (JSON.parse(config.data) as Partial<Row>) : {}

  if (method === 'get') {
    if (id) {
      const row = rows.find((r) => r.id === id)
      return row ? respond(config, 200, row) : respond(config, 404, {})
    }
    const params = (config.params ?? {}) as Record<string, unknown>
    const out = rows.filter((r) => Object.entries(params).every(([k, v]) => String(r[k]) === String(v)))
    return respond(config, 200, out)
  }
  if (method === 'post') {
    const row = { ...body, id: body.id ?? crypto.randomUUID() } as Row
    rows.push(row); save()
    return respond(config, 201, row)
  }
  const i = rows.findIndex((r) => r.id === id)
  if (i < 0) return respond(config, 404, {})
  if (method === 'delete') { rows.splice(i, 1); save(); return respond(config, 200, {}) }
  if (method === 'patch' || method === 'put') {
    rows[i] = method === 'put' ? ({ ...body, id } as Row) : { ...rows[i], ...body, id }
    save()
    return respond(config, 200, rows[i])
  }
  return respond(config, 405, {})
}
