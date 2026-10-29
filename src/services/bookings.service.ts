import { api, AppError } from '@/lib/axios'
import { requireTenantId } from '@/stores/auth.store'
import { tenantResource } from './tenant-resource'
import type { Booking, Hall, Menu } from '@/types'

const bookings = tenantResource<Booking>('bookings', 'bk')
const menus = tenantResource<Menu>('menus', 'menu')
const halls = tenantResource<Hall>('halls', 'hall')

export type BookingInput = Omit<Booking, 'id' | 'tenantId' | 'reference' | 'createdAt'>

export const bookingService = {
  getBookings: bookings.list,
  getBooking: bookings.get,
  getMenus: menus.list,
  getHalls: halls.list,

  async createBooking(input: BookingInput): Promise<Booking> {
    const tenantId = requireTenantId()
    const existing = await bookings.list()
    // TODO(laravel): generate the reference sequence inside a DB transaction to avoid duplicates.
    const next = existing.length + 1
    const { data: hotel } = await api.get<{ slug: string }>(`/hotels/${tenantId}`)
    const tag = hotel.slug.split('-').map((w) => w[0]).join('').toUpperCase()
    await assertHallFree(input.hallName, input.eventDate, input.shift)
    return bookings.create({ ...input, reference: `BK-${new Date().getFullYear()}-${tag}-${String(next).padStart(3, '0')}`, createdAt: new Date().toISOString() })
  },

  async updateBooking(id: string, patch: Partial<BookingInput>): Promise<Booking> {
    if (patch.hallName && patch.eventDate && patch.shift) await assertHallFree(patch.hallName, patch.eventDate, patch.shift, id)
    return bookings.update(id, patch)
  },

  /** Cancelling keeps the record for history. Stock is NOT touched by creating or cancelling a booking. */
  cancelBooking: (id: string) => bookings.update(id, { status: 'cancelled' }),
  deleteBooking: bookings.remove,

  async addPayment(id: string, amount: number, date: string): Promise<Booking> {
    const b = await bookings.get(id)
    return bookings.update(id, { payments: [...b.payments, { date, amount }] })
  },

  /** Hall availability for a date + shift among this hotel's non-cancelled bookings. */
  async isHallAvailable(hallName: string, eventDate: string, shift: string, excludeId?: string) {
    const all = await bookings.list()
    return !all.some((b) => b.id !== excludeId && b.status !== 'cancelled' && b.hallName === hallName && b.eventDate === eventDate && b.shift === shift)
  },
}

async function assertHallFree(hall: string, date: string, shift: string, excludeId?: string) {
  if (!(await bookingService.isHallAvailable(hall, date, shift, excludeId))) {
    throw new AppError('validation', 'hall_taken')
  }
}
