import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/stores/auth.store'
import { bookingService } from '@/services/bookings.service'
import { inventoryService } from '@/services/inventory.service'
import { employeeService, expenseService, incomeService, loanService, partnerService, salaryService } from '@/services/resources.service'

/** Every tenant-owned query key carries the tenant id, so cached data can never be shown to another tenant. */
function useTenantQuery<T>(name: string, fn: () => Promise<T>) {
  const tenantId = useAuth((s) => s.user?.tenantId)
  return useQuery({ queryKey: [name, tenantId], queryFn: fn, enabled: !!tenantId })
}

export const useBookings = () => useTenantQuery('bookings', bookingService.getBookings)
export const useMenus = () => useTenantQuery('menus', bookingService.getMenus)
export const useHalls = () => useTenantQuery('halls', bookingService.getHalls)
export const useItems = () => useTenantQuery('items', inventoryService.getItems)
export const useMovements = () => useTenantQuery('movements', inventoryService.getMovements)
export const useEmployees = () => useTenantQuery('employees', employeeService.getEmployees)
export const useSalaries = () => useTenantQuery('salaries', salaryService.getPayments)
export const usePartners = () => useTenantQuery('partners', partnerService.getPartners)
export const useLoans = () => useTenantQuery('loans', loanService.getLoans)
export const useExpenses = () => useTenantQuery('expenses', expenseService.getExpenses)
export const useIncome = () => useTenantQuery('income', incomeService.getIncome)

/** Invalidate by name(s) after a mutation. 'dashboard' and 'reports' derive from everything, so they are always refreshed. */
export function useInvalidate() {
  const qc = useQueryClient()
  return (...names: string[]) => Promise.all([...names, 'dashboard'].map((n) => qc.invalidateQueries({ queryKey: [n] })))
}
