import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en/translation.json'
import faAF from './locales/fa-AF/translation.json'

export const LANGUAGES = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'fa-AF', label: 'دری', dir: 'rtl' },
] as const
export type LangCode = (typeof LANGUAGES)[number]['code']

const STORAGE_KEY = 'hotelsaas.lang'

function initialLang(): LangCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'fa-AF') return saved
  } catch { /* storage unavailable */ }
  return 'en'
}

/** The single place where document lang/dir are set. Pages never touch them. */
function applyDocument(lng: string) {
  const dir = lng === 'fa-AF' ? 'rtl' : 'ltr'
  document.documentElement.lang = lng
  document.documentElement.dir = dir
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, 'fa-AF': { translation: faAF } },
  lng: initialLang(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'fa-AF'],
  interpolation: { escapeValue: false },
  returnNull: false,
})

applyDocument(i18n.language)
i18n.on('languageChanged', (lng) => {
  applyDocument(lng)
  try { localStorage.setItem(STORAGE_KEY, lng) } catch { /* ignore */ }
})

export default i18n
