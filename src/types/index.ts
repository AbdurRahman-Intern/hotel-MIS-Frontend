// Shared domain types. Mirrors the REST resources the future Laravel API should expose.

export type Role = 'super_admin' | 'hotel_owner'
export type HotelStatus = 'active' | 'suspended'
export type PlanId = 'starter' | 'professional' | 'enterprise'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  /** null for super_admin. Hotel owners are bound to exactly one tenant. */
  tenantId: string | null
}

/** Session as held by the frontend. Real auth (tokens, roles, tenants) belongs to Laravel. */
export interface Session {
  user: User
  token: string
}

export interface Plan {
  id: PlanId
  name: string
  priceMonthly: number
  maxUsers: number
}

export interface Hotel {
  id: string
  name: string
  slug: string
  ownerName: string
  ownerEmail: string
  phone: string
  address: string
  logoUrl: string | null
  status: HotelStatus
  planId: PlanId
  registeredAt: string // ISO date
  currency: string // ISO 4217, e.g. AFN
  dateFormat: string
  contactEmail: string
}

/** Tenant == Hotel in this prototype. */
export type Tenant = Hotel

interface TenantOwned {
  id: string
  tenantId: string
}

export type BookingStatus = 'draft' | 'pending' | 'confirmed' | 'completed' | 'cancelled'
export type EventType = 'Wedding' | 'Engagement' | 'Reception' | 'Birthday' | 'Corporate' | 'Other'
export type Shift = 'Day' | 'Night'

export interface Booking extends TenantOwned {
  reference: string
  clientName: string
  clientPhone: string
  eventType: EventType
  eventDate: string // ISO date
  shift: Shift
  guestCount: number
  hallName: string
  menuId: string
  foodPricePerPerson: number
  photographyPrice: number
  decorationPrice: number
  serviceCharge: number
  otherCharges: number
  discount: number
  advancePaid: number
  /** Additional payments recorded after the advance. */
  payments: { date: string; amount: number }[]
  status: BookingStatus
  notes: string
  createdAt: string
}

export interface MenuIngredient {
  inventoryItemId: string
  /** Quantity per guest, expressed in the inventory item's unit (e.g. 0.4 kg). */
  perPerson: number
}

export interface Menu extends TenantOwned {
  name: string
  pricePerPerson: number
  ingredients: MenuIngredient[]
}

export interface Hall extends TenantOwned {
  name: string
  capacity: number
}

export type InventoryCategory = 'Grains' | 'Meat' | 'Vegetables' | 'Dairy' | 'Spices' | 'Oil' | 'Beverages' | 'Others'

export interface InventoryItem extends TenantOwned {
  name: string
  category: InventoryCategory
  unit: string
  quantity: number
  minQuantity: number
  unitCost: number
  /** Quantity recorded as spoiled/damaged (cumulative). */
  spoiledQuantity: number
  updatedAt: string
}

export type StockMovementType = 'in' | 'out' | 'spoilage'

export interface StockMovement extends TenantOwned {
  itemId: string
  type: StockMovementType
  quantity: number
  unitCost: number
  date: string
  supplier?: string
  reference: string // invoice no. for stock-in; booking/hawala reference for stock-out
  bookingId?: string
  notes?: string
}

export type EmployeeStatus = 'active' | 'on_leave' | 'inactive'

export interface Employee extends TenantOwned {
  fullName: string
  phone: string
  position: string
  department: string
  employeeType: 'Full Time' | 'Part Time' | 'Contract'
  gender: 'Male' | 'Female'
  salary: number
  joinDate: string
  status: EmployeeStatus
  /** Some employees receive a share of the service charge, others do not. */
  serviceChargeEligible: boolean
  address: string
  idNumber: string
  emergencyContact: string
  notes: string
}

export type SalaryStatus = 'paid' | 'pending'

export interface SalaryPayment extends TenantOwned {
  employeeId: string
  month: string // YYYY-MM
  basicSalary: number
  serviceCharge: number
  advanceDeduction: number
  otherDeduction: number
  paidDate: string | null
  status: SalaryStatus
  notes: string
}

export type PartnerStatus = 'active' | 'inactive'

export interface PartnerTransaction {
  date: string
  type: 'contribution' | 'profit_share' | 'withdrawal'
  amount: number
  note: string
}

export interface Partner extends TenantOwned {
  fullName: string
  phone: string
  email: string
  address: string
  investment: number
  sharePercent: number
  startDate: string
  status: PartnerStatus
  notes: string
  /** Withdrawals are partner account movements, NOT operating expenses. */
  transactions: PartnerTransaction[]
}

export type LoanType = 'borrowed' | 'lent'
export type LoanStatus = 'open' | 'partial' | 'settled'

export interface Loan extends TenantOwned {
  type: LoanType
  party: string
  amount: number
  issueDate: string
  dueDate: string
  repayments: { date: string; amount: number }[]
  notes: string
}

export type PaymentMethod = 'Cash' | 'Bank'
export type ExpenseCategory = 'Utilities' | 'Fuel' | 'Gas' | 'Office Supplies' | 'Maintenance' | 'Internet' | 'Transport' | 'Rent' | 'Miscellaneous'

export interface Expense extends TenantOwned {
  date: string
  category: ExpenseCategory
  description: string
  amount: number
  paymentMethod: PaymentMethod
  paidBy: string
  reference: string
  notes: string
}

export type IncomeSource = 'Parking' | 'Recycling' | 'Other'

export interface ExternalIncome extends TenantOwned {
  date: string
  source: IncomeSource
  description: string
  amount: number
  receivedBy: string
  notes: string
}

export interface ActivityLog {
  id: string
  date: string
  message: string
}

export interface PlatformStats {
  totalHotels: number
  activeHotels: number
  suspendedHotels: number
  totalUsers: number
  recentHotels: Hotel[]
  growth: { month: string; hotels: number }[]
  planDistribution: { plan: string; count: number }[]
  activity: ActivityLog[]
}

export interface DashboardStatistics {
  dailyNetProfit: number
  monthIncome: number
  yearIncome: number
  monthExpenses: number
  yearExpenses: number
  monthWeddings: number
  yearWeddings: number
  totalLoanGiven: number
  totalBorrowed: number
  stockValue: number
  totalEmployees: number
  salaryPaidThisMonth: number
  monthly: { month: string; income: number; expenses: number; weddings: number }[]
  recentBookings: Booking[]
  lowStock: InventoryItem[]
  upcoming: Booking[]
  eventDistribution: { type: string; count: number }[]
  pendingPayments: number
  pendingBookings: number
  upcomingGuests: number
  todayBookings: number
}
