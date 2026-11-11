import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RedirectIfAuthed, RequireRole, homeFor } from '@/components/RouteGuards'
import { useAuth } from '@/stores/auth.store'
import { SuperAdminLayout } from '@/layouts/SuperAdminLayout'
import { HotelOwnerLayout } from '@/layouts/HotelOwnerLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { NotFoundPage, UnauthorizedPage } from '@/pages/StatusPages'
import { HotelDetailPage, HotelsPage, NewHotelPage, PlansPage, PlatformSettingsPage, SuperAdminDashboard, UsersPage } from '@/features/super-admin/SuperAdminPages'
import { HotelDashboard } from '@/features/dashboard/HotelDashboard'
import { BookingsPage } from '@/features/bookings/BookingsPage'
import { BookingForm } from '@/features/bookings/BookingForm'
import { BookingDetailPage } from '@/features/bookings/BookingDetailPage'
import { CalendarPage } from '@/features/bookings/CalendarPage'
import { HawalaPage } from '@/features/bookings/HawalaPage'
import { ItemForm, ItemsPage, StockInForm, StockInPage, StockOutForm, StockOutPage } from '@/features/inventory/InventoryPages'
import { EmployeeDetailPage, EmployeeForm, EmployeesPage } from '@/features/employees/EmployeePages'
import { SalariesPage } from '@/features/salaries/SalariesPage'
import { PartnerDetailPage, PartnerForm, PartnersPage } from '@/features/partners/PartnerPages'
import { LoansPage } from '@/features/loans/LoansPage'
import { ExpenseForm, ExpensesPage } from '@/features/expenses/ExpensePages'
import { IncomePage } from '@/features/income/IncomePage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { HotelSettingsPage } from '@/features/settings/HotelSettingsPage'
import { WebsitePage } from '@/features/website/WebsitePage'

function Root() {
  const user = useAuth((s) => s.user)
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />
}

export const router = createBrowserRouter([
  { path: '/', element: <Root /> },
  { element: <RedirectIfAuthed />, children: [{ path: '/login', element: <LoginPage /> }] },
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  {
    // Client-side guard only: UX, not security. Laravel must enforce roles server-side.
    element: <RequireRole role="super_admin" />,
    children: [{
      path: '/super-admin',
      element: <SuperAdminLayout />,
      children: [
        { index: true, element: <Navigate to="dashboard" replace /> },
        { path: 'dashboard', element: <SuperAdminDashboard /> },
        { path: 'hotels', element: <HotelsPage /> },
        { path: 'hotels/new', element: <NewHotelPage /> },
        { path: 'hotels/:id', element: <HotelDetailPage /> },
        { path: 'users', element: <UsersPage /> },
        { path: 'plans', element: <PlansPage /> },
        { path: 'settings', element: <PlatformSettingsPage /> },
      ],
    }],
  },
  {
    element: <RequireRole role="hotel_owner" />,
    children: [{
      path: '/hotel',
      element: <HotelOwnerLayout />,
      children: [
        { index: true, element: <Navigate to="dashboard" replace /> },
        { path: 'dashboard', element: <HotelDashboard /> },
        { path: 'bookings', element: <BookingsPage /> },
        { path: 'bookings/new', element: <BookingForm /> },
        { path: 'bookings/calendar', element: <CalendarPage /> },
        { path: 'bookings/hawala', element: <HawalaPage /> },
        { path: 'bookings/:id', element: <BookingDetailPage /> },
        { path: 'bookings/:id/edit', element: <BookingForm /> },
        { path: 'bookings/:id/hawala', element: <HawalaPage /> },
        { path: 'inventory', element: <ItemsPage /> },
        { path: 'inventory/new', element: <ItemForm /> },
        { path: 'inventory/:id/edit', element: <ItemForm /> },
        { path: 'inventory/stock-in', element: <StockInPage /> },
        { path: 'inventory/stock-in/new', element: <StockInForm /> },
        { path: 'inventory/stock-out', element: <StockOutPage /> },
        { path: 'inventory/stock-out/new', element: <StockOutForm /> },
        { path: 'employees', element: <EmployeesPage /> },
        { path: 'employees/new', element: <EmployeeForm /> },
        { path: 'employees/:id', element: <EmployeeDetailPage /> },
        { path: 'employees/:id/edit', element: <EmployeeForm /> },
        { path: 'salaries', element: <SalariesPage /> },
        { path: 'partners', element: <PartnersPage /> },
        { path: 'partners/new', element: <PartnerForm /> },
        { path: 'partners/:id', element: <PartnerDetailPage /> },
        { path: 'partners/:id/edit', element: <PartnerForm /> },
        { path: 'loans', element: <LoansPage /> },
        { path: 'income', element: <IncomePage /> },
        { path: 'expenses', element: <ExpensesPage /> },
        { path: 'expenses/new', element: <ExpenseForm /> },
        { path: 'expenses/:id/edit', element: <ExpenseForm /> },
        { path: 'reports', element: <ReportsPage /> },
        { path: 'website', element: <WebsitePage /> },
        { path: 'settings', element: <HotelSettingsPage /> },
      ],
    }],
  },
  { path: '*', element: <NotFoundPage /> },
], { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' })
