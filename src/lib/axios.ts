import axios, { AxiosError } from 'axios'
import { demoAdapter } from './demo-adapter'
import { tokenStore } from './token'

/** The ONE HTTP client used by every service. */
export const api = axios.create({
  // Laravel: http://127.0.0.1:8000/api  (set VITE_API_BASE_URL in .env, it must end with /api)
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  // GitHub Pages demo: no server, so serve the seed data from the browser. See demo-adapter.ts.
  ...(import.meta.env.VITE_DEMO_MODE === 'true' ? { adapter: demoAdapter } : {}),
})

/** Runs before every request: adds the Sanctum login token so Laravel knows who is calling. */
api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers.Accept = 'application/json' // makes Laravel answer errors as JSON
  return config
})

/** The small error type the UI deals with. `fields` holds Laravel's per-field validation messages (HTTP 422). */
export class AppError extends Error {
  constructor(
    public code: 'network' | 'not_found' | 'forbidden' | 'validation' | 'server',
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message)
  }
}

/** The JSON body Laravel sends with an error. */
type LaravelErrorBody = {
  message?: string
  code?: string // e.g. 'hotel_suspended'
  errors?: Record<string, string[]>
}

/** Converts any error into an AppError so components only handle five kinds. */
export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e
  if (e instanceof AxiosError) {
    if (!e.response) return new AppError('network', 'API unreachable')
    const status = e.response.status
    const body = e.response.data as LaravelErrorBody | undefined

    if (status === 404) return new AppError('not_found', 'Not found')
    if (status === 401 || status === 403) return new AppError('forbidden', body?.code ?? 'forbidden')
    if (status === 422) return new AppError('validation', body?.message ?? 'Validation failed', body?.errors)
    return new AppError('server', body?.message ?? e.message)
  }
  return new AppError('server', e instanceof Error ? e.message : 'Unknown error')
}

/** Runs on every response: failures become AppError. */
api.interceptors.response.use((r) => r, (e) => Promise.reject(toAppError(e)))