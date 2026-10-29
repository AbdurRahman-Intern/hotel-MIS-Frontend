import { Building2, LayoutDashboard, Layers, Settings, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AppShell, type NavItem } from './AppShell'

const nav: NavItem[] = [
  { key: 'dashboard', to: '/super-admin/dashboard', icon: LayoutDashboard },
  { key: 'hotels', to: '/super-admin/hotels', icon: Building2 },
  { key: 'users', to: '/super-admin/users', icon: Users },
  { key: 'plans', to: '/super-admin/plans', icon: Layers },
  { key: 'settings', to: '/super-admin/settings', icon: Settings },
]

export function SuperAdminLayout() {
  const { t } = useTranslation()
  return <AppShell nav={nav} accent="accent" brandTitle={t('superAdmin.brand')} brandSubtitle={t('superAdmin.console')} />
}
