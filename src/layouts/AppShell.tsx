import { useState, type ReactNode } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronsLeft, Crown, LogOut, Menu, X, CalendarDays, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '@/stores/auth.store'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useFormat } from '@/hooks/useFormat'
import { DirIcon } from '@/components/ui'

export interface NavItem { key: string; to: string; icon: LucideIcon; children?: { key: string; to: string }[]; end?: boolean }

interface Props {
  nav: NavItem[]
  brandTitle: string
  brandSubtitle: string
  accent: 'brand' | 'accent'
  searchTo?: string
  searchPlaceholder?: string
}

/** Shared responsive shell. In RTL the flex row reverses automatically, which moves the sidebar to the right. */
export function AppShell({ nav, brandTitle, brandSubtitle, accent, searchTo, searchPlaceholder }: Props) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const loc = useLocation()
  const { date } = useFormat()
  const [q, setQ] = useState('')

  const activeCls = accent === 'brand' ? 'bg-brand-600 text-white' : 'bg-accent-600 text-white'

  const sidebar = (compact: boolean) => (
    <div className="flex h-full flex-col bg-navy-900 text-slate-300">
      <div className={cn('flex items-center gap-3 border-b border-white/10 px-4 py-4', compact && 'justify-center px-2')}>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 text-gold"><Crown className="size-5" /></span>
        {!compact && <div className="min-w-0"><p className="truncate text-sm font-bold text-white">{brandTitle}</p><p className="truncate text-[11px] text-slate-400">{brandSubtitle}</p></div>}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Main">
        {nav.map((item) => {
          const Icon = item.icon
          const groupActive = item.children ? loc.pathname.startsWith(item.to) : false
          return (
            <div key={item.key}>
              <NavLink to={item.children ? item.children[0].to : item.to} end={item.end} title={t(`nav.${item.key}`)} onClick={() => setMobileOpen(false)}
                className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition', (isActive || groupActive) ? activeCls : 'hover:bg-white/10 hover:text-white', compact && 'justify-center px-2')}>
                <Icon className="size-[18px] shrink-0" />
                {!compact && <span className="truncate">{t(`nav.${item.key}`)}</span>}
              </NavLink>
              {item.children && groupActive && !compact && (
                <div className="ms-5 mt-0.5 space-y-0.5 border-s border-white/10 ps-3">
                  {item.children.map((c) => (
                    <NavLink key={c.key} to={c.to} end onClick={() => setMobileOpen(false)}
                      className={({ isActive }) => cn('block rounded-md px-3 py-1.5 text-[13px] transition', isActive ? 'bg-white/15 font-medium text-white' : 'text-slate-400 hover:text-white')}>
                      {t(`nav.${c.key}`)}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </div>
  )

  const doLogout = () => { logout(); qc.clear(); navigate('/login', { replace: true }) }

  return (
    <div className="flex min-h-screen">
      <aside className={cn('sticky top-0 hidden h-screen shrink-0 transition-[width] lg:block', collapsed ? 'w-[72px]' : 'w-64')}>{sidebar(collapsed)}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-64 shadow-xl">{sidebar(false)}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white/90 px-4 py-3 backdrop-blur">
          <button className="rounded-md p-2 hover:bg-slate-100 lg:hidden" aria-label="Menu" onClick={() => setMobileOpen((o) => !o)}>{mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
          <button className="hidden rounded-md p-2 hover:bg-slate-100 lg:block" aria-label={t('common.toggleSidebar')} onClick={() => setCollapsed((c) => !c)}><DirIcon icon={ChevronsLeft} className={cn('size-5 transition', collapsed && 'rotate-180')} /></button>
          {searchTo && (
            <form className="hidden max-w-sm flex-1 sm:block" onSubmit={(e) => { e.preventDefault(); navigate(`${searchTo}?q=${encodeURIComponent(q)}`) }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="input" />
            </form>
          )}
          <div className="ms-auto flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-sm text-muted md:flex"><CalendarDays className="size-4" />{date(new Date().toISOString().slice(0, 10))}</span>
            <LanguageSwitcher />
            <div className="relative">
              <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-lg p-1 pe-2 hover:bg-slate-100" aria-haspopup="menu" aria-expanded={menu}>
                <span className="grid size-8 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white">{user?.name.slice(0, 1)}</span>
                <span className="hidden text-start leading-tight sm:block"><span className="block text-sm font-semibold">{user?.name}</span><span className="block text-[11px] text-muted">{t(`roles.${user?.role}`)}</span></span>
                <ChevronDown className="size-4 text-muted" />
              </button>
              {menu && (
                <div role="menu" className="absolute end-0 mt-2 w-56 rounded-lg border border-line bg-white p-1 shadow-lg">
                  <div className="border-b border-line px-3 py-2 text-xs text-muted"><span className="ltr-isolate">{user?.email}</span></div>
                  <button role="menuitem" onClick={doLogout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"><LogOut className="size-4" />{t('auth.logout')}</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  )
}

export function ShellSlot({ children }: { children: ReactNode }) { return <>{children}</> }
