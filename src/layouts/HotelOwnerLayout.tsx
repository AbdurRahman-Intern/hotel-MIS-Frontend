import { Banknote, CalendarCheck, Globe, HandCoins, LayoutDashboard, Package, Receipt, Settings, FileBarChart, UserCog, Users, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AppShell, type NavItem } from './AppShell'
import { useOwnHotel } from '@/hooks/useOwnHotel'

const nav: NavItem[] = [
  { key: 'dashboard', to: '/hotel/dashboard', icon: LayoutDashboard },
  { key: 'bookings', to: '/hotel/bookings', icon: CalendarCheck, children: [{ key: 'allBookings', to: '/hotel/bookings' }, { key: 'addBooking', to: '/hotel/bookings/new' }, { key: 'calendar', to: '/hotel/bookings/calendar' }, { key: 'hawala', to: '/hotel/bookings/hawala' }] },
  { key: 'inventory', to: '/hotel/inventory', icon: Package, children: [{ key: 'stockItems', to: '/hotel/inventory' }, { key: 'stockIn', to: '/hotel/inventory/stock-in' }, { key: 'stockOut', to: '/hotel/inventory/stock-out' }] },
  { key: 'employees', to: '/hotel/employees', icon: Users },
  { key: 'salaries', to: '/hotel/salaries', icon: Wallet },
  { key: 'loans', to: '/hotel/loans', icon: HandCoins },
  { key: 'partners', to: '/hotel/partners', icon: UserCog },
  { key: 'income', to: '/hotel/income', icon: Banknote },
  { key: 'expenses', to: '/hotel/expenses', icon: Receipt },
  { key: 'reports', to: '/hotel/reports', icon: FileBarChart },
  { key: 'website', to: '/hotel/website', icon: Globe },
  { key: 'settings', to: '/hotel/settings', icon: Settings },
]

export function HotelOwnerLayout() {
  const { t } = useTranslation()
  // Workspace identity comes from the tenant bound to the session, never from the URL.
  const { data: hotel } = useOwnHotel()
  return <AppShell nav={nav} accent="brand" brandTitle={hotel?.name ?? '…'} brandSubtitle={t('hotel.workspace')} searchTo="/hotel/bookings" searchPlaceholder={t('bookings.searchPlaceholder')} />
}
