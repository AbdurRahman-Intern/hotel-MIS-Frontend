import { useTranslation } from 'react-i18next'
import { ComingSoon } from '@/pages/StatusPages'

/** The client lists a public website as a feature but gave no content spec yet, so this is an honest placeholder. */
export function WebsitePage() {
  const { t } = useTranslation()
  return <ComingSoon title={t('nav.website')} />
}
