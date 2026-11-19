import { AppError } from '@/lib/axios'
import { tenantResource } from './tenant-resource'
import { bookingService } from './bookings.service'
import type { Menu } from '@/types'

/**
 * menus.service.ts  -  create / edit / delete the hotel's food menus.
 *
 * A menu = a name + a price per person + a recipe (which warehouse items, how much per guest).
 * A booking picks one menu; the recipe x guest count becomes the warehouse requisition (hawala).
 *
 * LARAVEL: /menus (MenuController). Laravel answers 422 when the name is taken or the menu is still
 *          used by a booking; we translate those into short codes the UI knows.
 * DEMO:    the same rules are checked here in the browser.
 */
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'
const menus = tenantResource<Menu>('menus', 'menu')

/** What the form sends. The server adds id and tenantId. */
export type MenuInput = Pick<Menu, 'name' | 'pricePerPerson' | 'ingredients'>

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** Demo only: refuse a second menu with the same name. */
async function checkNameDemo(name: string, ignoreId?: string) {
  const all = await menus.list()
  if (all.some((m) => m.id !== ignoreId && same(m.name, name))) throw new AppError('validation', 'menu_name_taken')
}

/** Laravel 422 on "name" -> menu_name_taken; any other error is passed on unchanged. */
function mapSaveError(e: unknown): never {
  if (e instanceof AppError && e.code === 'validation' && e.fields?.name) throw new AppError('validation', 'menu_name_taken', e.fields)
  throw e
}

export const menuService = {
  /** All menus of this hotel (A-Z). */
  getMenus: async () => (await menus.list()).sort((a, b) => a.name.localeCompare(b.name)),

  /** POST /menus */
  async createMenu(input: MenuInput): Promise<Menu> {
    if (DEMO) await checkNameDemo(input.name)
    try { return await menus.create(input) } catch (e) { return mapSaveError(e) }
  },

  /** PATCH /menus/{id}. Editing the recipe changes the hawala of bookings that use the menu. */
  async updateMenu(id: string, input: MenuInput): Promise<Menu> {
    if (DEMO) await checkNameDemo(input.name, id)
    try { return await menus.update(id, input) } catch (e) { return mapSaveError(e) }
  },

  /** DELETE /menus/{id}. Refused (menu_in_use) while any booking still uses it. */
  async deleteMenu(id: string): Promise<void> {
    if (DEMO) {
      const bookings = await bookingService.getBookings()
      if (bookings.some((b) => b.menuId === id)) throw new AppError('validation', 'menu_in_use')
    }
    try { await menus.remove(id) } catch (e) {
      if (e instanceof AppError && e.code === 'validation' && e.fields?.menu) throw new AppError('validation', 'menu_in_use', e.fields)
      throw e
    }
  },
}
