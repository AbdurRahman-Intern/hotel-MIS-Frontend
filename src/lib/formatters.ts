// Display-only formatting. Stored/API values stay ISO dates and plain numbers.
// Calendar: Gregorian in both languages (deliberate); Dari only changes labels and digit shaping.
import { format, parseISO } from 'date-fns'
import { enUS, faIR } from 'date-fns/locale'

export type Lang = 'en' | 'fa-AF'
export const DEFAULT_CURRENCY = 'AFN'

/** Numbering system: Latin digits for both languages so phone numbers, IDs and amounts stay unambiguous. */
const numLocale = (lang: Lang) => (lang === 'fa-AF' ? 'fa-AF-u-nu-latn' : 'en-US')

export function formatNumber(n: number, lang: Lang, digits = 0) {
  return new Intl.NumberFormat(numLocale(lang), { maximumFractionDigits: digits }).format(n)
}

export function formatCurrency(n: number, lang: Lang, currency = DEFAULT_CURRENCY) {
  const code = currency || DEFAULT_CURRENCY
  const fractional = code === 'USD' || code === 'EUR'
  const num = new Intl.NumberFormat(numLocale(lang), { minimumFractionDigits: 0, maximumFractionDigits: fractional ? 2 : 0 }).format(n)
  return lang === 'fa-AF' ? `${num} ${code}` : `${code} ${num}`
}

export function formatPercent(n: number, lang: Lang) {
  return `${formatNumber(n, lang, 1)}%`
}

const dfLocale = (lang: Lang) => (lang === 'fa-AF' ? faIR : enUS)

export function formatDate(iso: string | null | undefined, lang: Lang, pattern = 'dd MMM yyyy') {
  if (!iso) return '-'
  try {
    // Dari month names via Intl for correct Gregorian-month names in Dari.
    if (lang === 'fa-AF') {
      return new Intl.DateTimeFormat('fa-AF-u-ca-gregory-nu-latn', { day: '2-digit', month: 'short', year: 'numeric' }).format(parseISO(iso))
    }
    return format(parseISO(iso), pattern, { locale: dfLocale(lang) })
  } catch {
    return iso
  }
}

export function formatDateTime(iso: string, lang: Lang) {
  try {
    return new Intl.DateTimeFormat(numLocale(lang).replace('-u-nu-latn', '') + (lang === 'fa-AF' ? '-u-ca-gregory-nu-latn' : ''), { dateStyle: 'medium', timeStyle: 'short' }).format(parseISO(iso))
  } catch {
    return iso
  }
}

export function formatMonth(ym: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'fa-AF' ? 'fa-AF-u-ca-gregory-nu-latn' : 'en-US', { month: 'long', year: 'numeric' }).format(parseISO(`${ym}-01`))
}

export function shortMonth(monthIndex0: number, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'fa-AF' ? 'fa-AF-u-ca-gregory-nu-latn' : 'en-US', { month: 'short' }).format(new Date(2026, monthIndex0, 1))
}

export function formatCompact(n: number, lang: Lang) {
  return new Intl.NumberFormat(numLocale(lang), { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}
