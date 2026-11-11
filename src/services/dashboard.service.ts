import { api } from '@/lib/axios'
import { bookingService } from './bookings.service'
import { inventoryService } from './inventory.service'
import { employeeService, expenseService, incomeService, loanService, salaryService } from './resources.service'
import { calcBookingTotals, calcLoan, calcSalary, isRevenueBooking, stockStatus, stockValue, sum } from '@/lib/domain'
import type { DashboardStatistics } from '@/types'

/** True on the GitHub Pages demo (VITE_DEMO_MODE=true): no server, so numbers are calculated in the browser. */
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

const TODAY = () => new Date().toISOString().slice(0, 10)

/**
 * Dashboard numbers for the hotel owner.
 *
 * LARAVEL MODE (default): GET /dashboard?year=2026. The server calculates everything
 *   (hotel-saas-api/app/Services/DashboardService.php, same formulas as computeDashboardLocally below).
 * DEMO MODE (GitHub Pages): computed in the browser from the demo data.
 *
 * @param year  the year of the yearly numbers and the chart (default: this year)
 */
export async function getHotelDashboard(year = new Date().getFullYear()): Promise<DashboardStatistics> {
  if (!DEMO) {
    const { data } = await api.get<DashboardStatistics>('/dashboard', { params: { year } })
    return data
  }
  return computeDashboardLocally(year)
}

/**
 * DEMO MODE ONLY. Computes the dashboard in the browser from tenant-scoped data.
 * Definitions: "income" = CASH RECEIVED from bookings + external income. "Booked revenue" is reported separately in Reports.
 * Keep it identical to DashboardService.php; when the demo is no longer needed, delete this function.
 */
async function computeDashboardLocally(year: number): Promise<DashboardStatistics> {
  const [bookings, items, employees, expenses, income, loans, salaries] = await Promise.all([
    bookingService.getBookings(), inventoryService.getItems(), employeeService.getEmployees(),
    expenseService.getExpenses(), incomeService.getIncome(), loanService.getLoans(), salaryService.getPayments(),
  ])
  const today = TODAY()
  const ym = today.slice(0, 7)
  const live = bookings.filter((b) => b.status !== 'cancelled' && b.status !== 'draft')

  const monthly = Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`
    const mb = live.filter((b) => b.eventDate.startsWith(key))
    const cash = sum(mb.map((b) => calcBookingTotals(b).received)) + sum(income.filter((x) => x.date.startsWith(key)).map((x) => x.amount))
    const spent = sum(expenses.filter((x) => x.date.startsWith(key)).map((x) => x.amount))
    return { month: key, income: cash, expenses: spent, weddings: mb.length }
  })

  const monthRow = monthly.find((m) => m.month === ym) ?? { income: 0, expenses: 0, weddings: 0 }
  const upcoming = live.filter((b) => b.eventDate >= today).sort((a, b) => a.eventDate.localeCompare(b.eventDate))
  const types = new Map<string, number>()
  live.filter((b) => b.eventDate.startsWith(String(year))).forEach((b) => types.set(b.eventType, (types.get(b.eventType) ?? 0) + 1))

  const loanCalc = loans.map((l) => ({ l, c: calcLoan(l) }))
  const dayIncome = sum(income.filter((x) => x.date === today).map((x) => x.amount))
  const dayExpense = sum(expenses.filter((x) => x.date === today).map((x) => x.amount))

  return {
    dailyNetProfit: dayIncome - dayExpense,
    monthIncome: monthRow.income,
    yearIncome: sum(monthly.map((m) => m.income)),
    monthExpenses: monthRow.expenses,
    yearExpenses: sum(monthly.map((m) => m.expenses)),
    monthWeddings: monthRow.weddings,
    yearWeddings: sum(monthly.map((m) => m.weddings)),
    totalLoanGiven: sum(loanCalc.filter((x) => x.l.type === 'lent').map((x) => x.c.outstanding)),
    totalBorrowed: sum(loanCalc.filter((x) => x.l.type === 'borrowed').map((x) => x.c.outstanding)),
    stockValue: sum(items.map(stockValue)),
    totalEmployees: employees.filter((e) => e.status !== 'inactive').length,
    salaryPaidThisMonth: sum(salaries.filter((s) => s.status === 'paid' && s.month === ym).map((s) => calcSalary(s).net)),
    monthly,
    recentBookings: [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    lowStock: items.filter((i) => stockStatus(i) !== 'in_stock').slice(0, 5),
    upcoming: upcoming.slice(0, 5),
    eventDistribution: [...types.entries()].map(([type, count]) => ({ type, count })),
    pendingPayments: sum(live.filter(isRevenueBooking).map((b) => calcBookingTotals(b).remaining)),
    pendingBookings: bookings.filter((b) => b.status === 'pending').length,
    upcomingGuests: sum(upcoming.map((b) => b.guestCount)),
    todayBookings: live.filter((b) => b.eventDate === today).length,
  }
}