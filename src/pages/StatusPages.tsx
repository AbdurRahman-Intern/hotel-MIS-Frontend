import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Compass, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/stores/auth.store'
import { Button, DirIcon } from '@/components/ui'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { homeFor } from '@/components/RouteGuards'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

function Frame({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface p-6">
      <div className="flex justify-end"><LanguageSwitcher /></div>
      <div className="m-auto max-w-md text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm ring-1 ring-line">{icon}</span>
        <h1 className="mt-6 text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-muted">{text}</p>
        <div className="mt-6 flex justify-center gap-2">{children}</div>
      </div>
    </div>
  )
}

export function NotFoundPage() {
  const { t } = useTranslation()
  const user = useAuth((s) => s.user)
  return (
    <Frame icon={<Compass className="size-8" />} title={t('errors.notFoundTitle')} text={t('errors.notFoundText')}>
      <Link to={user ? homeFor(user.role) : '/login'} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">{t('errors.goHome')}</Link>
    </Frame>
  )
}

export function UnauthorizedPage() {
  const { t } = useTranslation()
  const user = useAuth((s) => s.user)
  const navigate = useNavigate()
  return (
    <Frame icon={<ShieldAlert className="size-8 text-red-500" />} title={t('errors.unauthorizedTitle')} text={t('errors.unauthorizedText')}>
      <Button variant="secondary" onClick={() => navigate(-1)}><DirIcon icon={ArrowLeft} className="size-4" />{t('common.back')}</Button>
      <Link to={user ? homeFor(user.role) : '/login'} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">{t('errors.goHome')}</Link>
    </Frame>
  )
}

/** Honest placeholder for modules that are intentionally not built yet. */
export function ComingSoon({ title }: { title: string }) {
  const { t } = useTranslation()
  return (
    <div className="card mx-auto mt-10 max-w-xl p-10 text-center">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 text-muted">{t('common.comingSoonText')}</p>
    </div>
  )
}
