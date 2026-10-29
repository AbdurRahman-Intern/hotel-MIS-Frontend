import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useTranslation } from 'react-i18next'
import { queryClient } from '@/app/query-client'
import { router } from '@/app/router'
import { authService } from '@/services/auth.service'
import { useAuth } from '@/stores/auth.store'
import { useLang } from '@/hooks/useLang'
import { Button, ErrorState, Spinner } from '@/components/ui'
import { useState } from 'react'

function Bootstrap() {
  const { t } = useTranslation()
  const { dir } = useLang()
  const status = useAuth((s) => s.status)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const { userId, setReady } = useAuth.getState()
    if (!userId) { setReady(null); return }
    setError(null)
    // Role and tenant are re-read from the API; whatever sits in localStorage is ignored.
    authService.restore(userId).then(setReady).catch(setError)
  }, [attempt])

  if (error) return <div className="grid min-h-screen place-items-center"><div><ErrorState error={error} /><div className="text-center"><Button onClick={() => setAttempt((a) => a + 1)}>{t('common.retry')}</Button></div></div></div>
  if (status === 'loading') return <Spinner label={t('common.loading')} />
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position={dir === 'rtl' ? 'top-left' : 'top-right'} richColors dir={dir} />
    </>
  )
}

export function App() {
  return <QueryClientProvider client={queryClient}><Bootstrap /></QueryClientProvider>
}
