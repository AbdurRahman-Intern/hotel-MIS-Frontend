import { api, AppError } from '@/lib/axios'
import { requireTenantId } from '@/stores/auth.store'
import { tenantResource } from './tenant-resource'
import type { Booking, Hall, Menu } from '@/types'

/**
 * bookings.service.ts  -  everything the Bookings screens need from the API.
 *
 * LARAVEL MODE (default)  the server does the hard work:
 *   - creates the booking reference (BK-2026-001) inside a database transaction
 *   - refuses a hall that is already taken for that date + shift (HTTP 422)
 *   - adds payments and cancels through their own endpoints
 * DEMO MODE (GitHub Pages)  the browser does that work itself, as the old prototype did.
 *
 * Laravel endpoints used (hotel-saas-api/routes/api.php):
 *   GET/POST /bookings    GET/PATCH/DELETE /bookings/{id}
 *   POST /bookings/{id}/payments    POST /bookings/{id}/cancel
 *   GET /menus    GET /halls
 */

/** True on the GitHub Pages demo (VITE_DEMO_MODE=true). */
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

/** Standard CRUD helpers for each collection (see tenant-resource.ts). */
const bookings = tenantResource<Booking>('bookings', 'bk')
const menus = tenantResource<Menu>('menus', 'menu')
const halls = tenantResource<Hall>('halls', 'hall')

/** What the booking form sends. The server (or demo code) adds id, reference and createdAt. */
export type BookingInput = Omit<Booking, 'id' | 'tenantId' | 'reference' | 'createdAt'>

/**
 * Laravel answers "this hall is taken" as 422 with an error on the field `hallName`.
 * The form only knows the code 'hall_taken', so we translate that one case and pass every other error on.
 *
 * @param e  whatever the API call threw
 * @returns  never returns, it always throws
 */
function rethrowHallClash(e: unknown): never {
  if (e instanceof AppError && e.code === 'validation' && e.fields?.hallName) {
    throw new AppError('validation', 'hall_taken', e.fields)
  }
  throw e
}

export const bookingService = {
  /** All bookings of this hotel. */
  getBookings: bookings.list,

  /** One booking by id. */
  getBooking: bookings.get,

  /** Menus for the booking form's menu dropdown. */
  getMenus: menus.list,

  /** Halls for the booking form's hall dropdown. */
  getHalls: halls.list,

  /**
   * Create a booking.
   * Laravel: POST /bookings. The server picks the reference and checks hall availability atomically.
   * Demo: the browser counts existing bookings to make a reference, then checks the hall.
   *
   * @throws AppError('validation', 'hall_taken') when the hall is already booked for that date + shift
   */
  async createBooking(input: BookingInput): Promise<Booking> {
    if (!DEMO) {
      try {
        return await bookings.create(input as Omit<Booking, 'id' | 'tenantId'>)
      } catch (e) {
        return rethrowHallClash(e)
      }
    }

    // ---- DEMO MODE ONLY ----
    const tenantId = requireTenantId()
    const existing = await bookings.list()
    const next = existing.length + 1
    const { data: hotel } = await api.get<{ slug: string }>(`/hotels/${tenantId}`)
    const tag = hotel.slug.split('-').map((w) => w[0]).join('').toUpperCase()
    await assertHallFree(input.hallName, input.eventDate, input.shift)
    return bookings.create({
      ...input,
      reference: `BK-${new Date().getFullYear()}-${tag}-${String(next).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
    })
  },

  /**
   * Change some fields of a booking.
   * Laravel re-checks the hall by itself whenever the hall, date or shift changes.
   *
   * @param id     booking id
   * @param patch  only the fields that changed
   */
  async updateBooking(id: string, patch: Partial<BookingInput>): Promise<Booking> {
    if (!DEMO) {
      try {
        return await bookings.update(id, patch)
      } catch (e) {
        return rethrowHallClash(e)
      }
    }
    if (patch.hallName && patch.eventDate && patch.shift) await assertHallFree(patch.hallName, patch.eventDate, patch.shift, id)
    return bookings.update(id, patch)
  },

  /**
   * Cancel a booking. The record is kept for history and the hall becomes free again.
   * Stock is NOT touched by creating or cancelling a booking.
   * Laravel: POST /bookings/{id}/cancel
   */
  cancelBooking: (id: string): Promise<Booking> =>
    DEMO
      ? bookings.update(id, { status: 'cancelled' })
      : api.post<Booking>(`/bookings/${id}/cancel`).then((r) => r.data),

  /** Permanently delete a booking. */
  deleteBooking: bookings.remove,

  /**
   * Record a payment received after the advance.
   * Laravel: POST /bookings/{id}/payments  { date, amount }  -> returns the updated booking.
   *
   * @param id      booking id
   * @param amount  money received (must be greater than 0)
   * @param date    'YYYY-MM-DD'
   */
  async addPayment(id: string, amount: number, date: string): Promise<Booking> {
    if (!DEMO) {
      const { data } = await api.post<Booking>(`/bookings/${id}/payments`, { date, amount })
      return data
    }
    const b = await bookings.get(id)
    return bookings.update(id, { payments: [...b.payments, { date, amount }] })
  },

  /**
   * Is this hall free on that date + shift? Used by the booking form to warn the user early.
   * Cancelled bookings never block a hall. The final check still happens on the server when saving.
   * Laravel: GET /bookings?hallName=..&eventDate=..&shift=.. (the API supports these filters)
   *
   * @param excludeId  the booking being edited, so it does not clash with itself
   */
  async isHallAvailable(hallName: string, eventDate: string, shift: string, excludeId?: string): Promise<boolean> {
    let candidates: Booking[]
    if (DEMO) {
      candidates = await bookings.list()
    } else {
      const { data } = await api.get<Booking[]>('/bookings', { params: { hallName, eventDate, shift } })
      candidates = data
    }
    return !candidates.some(
      (b) => b.id !== excludeId && b.status !== 'cancelled' && b.hallName === hallName && b.eventDate === eventDate && b.shift === shift,
    )
  },
}

/** DEMO MODE ONLY: throws the 'hall_taken' error the booking form already knows how to show. */
async function assertHallFree(hall: string, date: string, shift: string, excludeId?: string) {
  if (!(await bookingService.isHallAvailable(hall, date, shift, excludeId))) {
    throw new AppError('validation', 'hall_taken')
  }
}