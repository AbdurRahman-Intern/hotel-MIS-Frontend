import { AppError } from '@/lib/axios'
import { tenantResource } from './tenant-resource'
import type { InventoryItem, StockMovement } from '@/types'

const items = tenantResource<InventoryItem>('inventoryItems', 'inv')
const movements = tenantResource<StockMovement>('stockMovements', 'mv')

export interface MovementLine { itemId: string; quantity: number; unitCost?: number }

const today = () => new Date().toISOString().slice(0, 10)

export const inventoryService = {
  getItems: items.list,
  getItem: items.get,
  createItem: (i: Omit<InventoryItem, 'id' | 'tenantId' | 'updatedAt'>) => items.create({ ...i, updatedAt: today() }),
  updateItem: (id: string, patch: Partial<InventoryItem>) => items.update(id, { ...patch, updatedAt: today() }),
  deleteItem: items.remove,
  getMovements: async () => (await movements.list()).sort((a, b) => b.date.localeCompare(a.date)),

  /**
   * Stock-in (purchase). Increases quantity and may update the unit cost to the latest purchase price (prices follow the daily market rate).
   * TODO(laravel): run movement + quantity update in one DB transaction.
   */
  async stockIn(input: { date: string; supplier: string; reference: string; notes?: string; lines: MovementLine[] }) {
    for (const l of input.lines) {
      const item = await items.get(l.itemId)
      await movements.create({ itemId: l.itemId, type: 'in', quantity: l.quantity, unitCost: l.unitCost ?? item.unitCost, date: input.date, supplier: input.supplier, reference: input.reference, notes: input.notes })
      await items.update(l.itemId, { quantity: item.quantity + l.quantity, unitCost: l.unitCost ?? item.unitCost, updatedAt: today() })
    }
  },

  /**
   * Stock-out (hawala/issue). BUSINESS RULE: stock can never go negative; the whole request is rejected if any line exceeds availability.
   * Creating a booking never calls this: stock is only issued by an explicit stock-out / "Send to warehouse" action.
   */
  async stockOut(input: { date: string; reference: string; bookingId?: string; notes?: string; lines: MovementLine[] }) {
    const loaded = await Promise.all(input.lines.map((l) => items.get(l.itemId)))
    input.lines.forEach((l, i) => {
      if (l.quantity > loaded[i].quantity) throw new AppError('validation', `insufficient:${loaded[i].name}`)
    })
    for (let i = 0; i < input.lines.length; i++) {
      const l = input.lines[i]
      const item = loaded[i]
      await movements.create({ itemId: item.id, type: 'out', quantity: l.quantity, unitCost: item.unitCost, date: input.date, reference: input.reference, bookingId: input.bookingId, notes: input.notes })
      await items.update(item.id, { quantity: item.quantity - l.quantity, updatedAt: today() })
    }
  },

  /** Records spoiled quantity (removed from stock, tracked separately). */
  async recordSpoilage(itemId: string, quantity: number) {
    const item = await items.get(itemId)
    if (quantity > item.quantity) throw new AppError('validation', `insufficient:${item.name}`)
    await movements.create({ itemId, type: 'spoilage', quantity, unitCost: item.unitCost, date: today(), reference: 'Spoilage' })
    return items.update(itemId, { quantity: item.quantity - quantity, spoiledQuantity: item.spoiledQuantity + quantity, updatedAt: today() })
  },
}
