import { useTranslation } from 'react-i18next'
import type { Lang } from '@/lib/formatters'

/** Language, direction and bound formatters for components. Language is independent of role/tenant. */
export function useLang() {
  const { i18n } = useTranslation()
  const lang = (i18n.language === 'fa-AF' ? 'fa-AF' : 'en') as Lang
  return { lang, dir: lang === 'fa-AF' ? ('rtl' as const) : ('ltr' as const), setLang: (l: Lang) => void i18n.changeLanguage(l) }
}
