
import { tenantResource } from './tenant-resource'
import type { Hall, Menu, MenuIngredient } from '@/types'

const halls = tenantResource<Hall>('halls', 'hall')
const menus = tenantResource<Menu>('menus', 'menu')

export type HallInput = Pick<Hall, 'name' | 'capacity'>

export type MenuInput =
  Pick<Menu, 'name' | 'pricePerPerson'> & {
    ingredients: MenuIngredient[]
  }

export const catalogService = {
  // Hall API
  listHalls: halls.list,

  createHall: (value: HallInput) =>
    halls.create(value),

  updateHall: (id: string, value: HallInput) =>
    halls.update(id, value),

  deleteHall: halls.remove,

  // Menu API
  listMenus: menus.list,

  createMenu: (value: MenuInput) =>
    menus.create(value),

  updateMenu: (id: string, value: MenuInput) =>
    menus.update(id, value),

  deleteMenu: menus.remove,
}
