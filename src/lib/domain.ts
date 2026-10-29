// Single source of truth for business calculations. Never re-implement these inside components.
import type { Booking, InventoryItem, Loan, LoanStatus, Menu, Employee, SalaryPayment, Partner, StockMovement } from '@/types'

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
export const round2 = (n: number) => Math.round(n * 100) / 100

// ---------- Bookings ----------
export interface BookingTotals {
  foodTotal: number
  subtotal: number
  /** Booked (contractual) revenue. NOT cash received and NOT profit. */
  estimatedTotal: number
  received: number
  remaining: number
}

type BookingPricing = Pick<Booking, 'guestCount' | 'foodPricePerPerson' | 'photographyPrice' | 'decorationPrice' | 'serviceCharge' | 'otherCharges' | 'discount' | 'advancePaid'> & { payments?: Booking['payments'] }

export function calcBookingTotals(b: BookingPricing): BookingTotals {
  const foodTotal = b.guestCount * b.foodPricePerPerson
  const subtotal = foodTotal + b.photographyPrice + b.decorationPrice + b.serviceCharge + b.otherCharges
  const estimatedTotal = Math.max(0, subtotal - b.discount)
  const received = b.advancePaid + sum((b.payments ?? []).map((p) => p.amount))
  return { foodTotal, subtotal, estimatedTotal, received, remaining: Math.max(0, estimatedTotal - received) }
}

/** Cancelled and draft bookings do not count as booked revenue. */
export const isRevenueBooking = (b: Booking) => b.status === 'confirmed' || b.status === 'completed' || b.status === 'pending'

// ---------- Inventory ----------
export type StockStatus = 'in_stock' | 'low' | 'out'
export const stockValue = (i: Pick<InventoryItem, 'quantity' | 'unitCost'>) => round2(i.quantity * i.unitCost)
export function stockStatus(i: Pick<InventoryItem, 'quantity' | 'minQuantity'>): StockStatus {
  if (i.quantity <= 0) return 'out'
  if (i.quantity < i.minQuantity) return 'low'
  return 'in_stock'
}

export interface RequisitionLine {
  item: InventoryItem
  perPerson: number
  required: number
  available: number
  cost: number
  status: 'in_stock' | 'low'
  shortfall: number
}

/** Generates ingredient requirements from a menu recipe and guest count. Does NOT touch stock. */
export function buildRequisition(menu: Menu | undefined, guests: number, items: InventoryItem[]): RequisitionLine[] {
  if (!menu) return []
  const lines: RequisitionLine[] = []
  for (const ing of menu.ingredients) {
    const item = items.find((i) => i.id === ing.inventoryItemId)
    if (!item) continue
    const required = round2(ing.perPerson * guests)
    lines.push({
      item, perPerson: ing.perPerson, required, available: item.quantity, cost: round2(required * item.unitCost),
      status: item.quantity < required ? 'low' : 'in_stock', shortfall: Math.max(0, round2(required - item.quantity)),
    })
  }
  return lines
}

export const isMeat = (l: RequisitionLine) => l.item.category === 'Meat'
export const isVegetable = (l: RequisitionLine) => l.item.category === 'Vegetables'

export function movementTotal(m: Pick<StockMovement, 'quantity' | 'unitCost'>) {
  return round2(m.quantity * m.unitCost)
}

// ---------- Employees / salaries ----------
export function calcSalary(p: Pick<SalaryPayment, 'basicSalary' | 'serviceCharge' | 'advanceDeduction' | 'otherDeduction'>) {
  const gross = p.basicSalary + p.serviceCharge
  const deductions = p.advanceDeduction + p.otherDeduction
  return { gross, deductions, net: Math.max(0, gross - deductions) }
}
export const defaultServiceCharge = (e: Pick<Employee, 'serviceChargeEligible'>, pool = 0) => (e.serviceChargeEligible ? pool : 0)

// ---------- Partners ----------
export function calcPartner(p: Partner) {
  const contributed = sum(p.transactions.filter((t) => t.type === 'contribution').map((t) => t.amount))
  const profitShare = sum(p.transactions.filter((t) => t.type === 'profit_share').map((t) => t.amount))
  const withdrawn = sum(p.transactions.filter((t) => t.type === 'withdrawal').map((t) => t.amount))
  // Withdrawals reduce the partner's account balance. They are NOT operating expenses.
  return { contributed, profitShare, withdrawn, balance: profitShare - withdrawn }
}

// ---------- Loans ----------
export function calcLoan(l: Loan): { repaid: number; outstanding: number; status: LoanStatus } {
  const repaid = sum(l.repayments.map((r) => r.amount))
  const outstanding = Math.max(0, l.amount - repaid)
  const status: LoanStatus = outstanding === 0 ? 'settled' : repaid > 0 ? 'partial' : 'open'
  return { repaid, outstanding, status }
}
