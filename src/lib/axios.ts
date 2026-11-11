import axios, { AxiosError } from 'axios'
import { demoAdapter } from './demo-adapter'

/** Single Axios instance. Point VITE_API_BASE_URL at JSON Server now, Laravel later. */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  // Static hosting (GitHub Pages): no API server, so serve the seed data from the browser. See demo-adapter.ts.
  ...(import.meta.env.VITE_DEMO_MODE === 'true' ? { adapter: demoAdapter } : {}),
})

// TODO(laravel): attach `Authorization: Bearer <token>` (Sanctum) here. Laravel must validate it on every request.

export class AppError extends Error {
  constructor(public code: 'network' | 'not_found' | 'forbidden' | 'validation' | 'server', message: string) {
    super(message)
  }
}

/** Maps transport errors to a small set of app errors so UI can show helpful messages. */
export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e
  if (e instanceof AxiosError) {
    if (!e.response) return new AppError('network', 'API unreachable')
    if (e.response.status === 404) return new AppError('not_found', 'Not found')
    if (e.response.status === 403 || e.response.status === 401) return new AppError('forbidden', 'Forbidden')
    return new AppError('server', e.message)
  }
  return new AppError('server', e instanceof Error ? e.message : 'Unknown error')
}

api.interceptors.response.use((r) => r, (e) => Promise.reject(toAppError(e)))
