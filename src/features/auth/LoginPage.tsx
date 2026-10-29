import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Building2, Crown, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { authService } from '@/services/auth.service'
import { useAuth } from '@/stores/auth.store'
import { AppError } from '@/lib/axios'
import { Button, Field, Input } from '@/components/ui'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { homeFor } from '@/components/RouteGuards'

const schema = z.object({
  email: z.string().min(1, 'validation.required').email('validation.email'),
  password: z.string().min(1, 'validation.required'),
})
type Values = z.infer<typeof schema>

const demo = [
  { labelKey: 'auth.demoAdmin', email: 'admin@hotelsaas.demo' },
  { labelKey: 'auth.demoRoyal', email: 'owner@royal.demo' },
  { labelKey: 'auth.demoKabul', email: 'owner@kabulgrand.demo' },
]

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuth((s) => s.setSession)
  const [show, setShow] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  const onSubmit = async (v: Values) => {
    setFormError(null)
    try {
      const user = await authService.login(v.email, v.password)
      setSession(user)
      const from = (location.state as { from?: string } | null)?.from
      const allowed = from && ((user.role === 'super_admin' && from.startsWith('/super-admin')) || (user.role === 'hotel_owner' && from.startsWith('/hotel')))
      navigate(allowed ? from : homeFor(user.role), { replace: true })
      toast.success(t('auth.welcome', { name: user.name }))
    } catch (e) {
      if (e instanceof AppError && e.code === 'network') setFormError(t('errors.network'))
      else if (e instanceof AppError && e.message === 'hotel_suspended') setFormError(t('auth.suspended'))
      else setFormError(t('auth.invalid'))
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-navy-900 p-10 text-white lg:flex">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-white/10 text-gold"><Crown className="size-6" /></span><span className="text-lg font-bold">{t('app.name')}</span></div>
        <div>
          <h2 className="max-w-md text-3xl font-bold leading-snug">{t('auth.heroTitle')}</h2>
          <p className="mt-3 max-w-md text-slate-300">{t('auth.heroText')}</p>
          <ul className="mt-8 space-y-3 text-sm text-slate-200">
            <li className="flex items-center gap-3"><Building2 className="size-5 text-gold" />{t('auth.point1')}</li>
            <li className="flex items-center gap-3"><ShieldCheck className="size-5 text-gold" />{t('auth.point2')}</li>
          </ul>
        </div>
        <p className="text-xs text-slate-400">{t('auth.prototypeNote')}</p>
      </div>

      <div className="flex flex-col p-6 sm:p-10">
        <div className="flex justify-end"><LanguageSwitcher /></div>
        <div className="m-auto w-full max-w-md">
          <div className="mb-8 lg:hidden flex items-center gap-2"><span className="grid size-9 place-items-center rounded-lg bg-navy-900 text-gold"><Crown className="size-5" /></span><span className="font-bold">{t('app.name')}</span></div>
          <h1 className="text-2xl font-bold">{t('auth.signIn')}</h1>
          <p className="mt-1 text-sm text-muted">{t('auth.signInHint')}</p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            {formError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
            <Field label={t('auth.email')} required error={errors.email?.message}>
              <Input type="email" dir="ltr" autoComplete="username" placeholder="name@example.com" {...register('email')} />
            </Field>
            <Field label={t('auth.password')} required error={errors.password?.message}>
              <div className="relative">
                <Input type={show ? 'text' : 'password'} dir="ltr" autoComplete="current-password" className="pe-10" {...register('password')} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={t('auth.togglePassword')} className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-muted">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
              </div>
            </Field>
            <Button type="submit" loading={isSubmitting} className="w-full py-2.5">{t('auth.signInButton')}</Button>
          </form>

          <div className="mt-8 rounded-lg border border-dashed border-line bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t('auth.demoTitle')}</p>
            <p className="mt-1 text-xs text-muted">{t('auth.demoNote')}</p>
            <div className="mt-3 space-y-2">
              {demo.map((d) => (
                <button key={d.email} type="button" onClick={() => { setValue('email', d.email); setValue('password', 'Demo@123456') }} className="flex w-full items-center justify-between rounded-md border border-line px-3 py-2 text-sm hover:bg-slate-50">
                  <span className="font-medium">{t(d.labelKey)}</span><span className="ltr-isolate text-xs text-muted">{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
