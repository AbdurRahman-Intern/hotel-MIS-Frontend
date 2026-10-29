import { useCallback } from 'react'
import { useLang } from './useLang'
import { useOwnHotel } from './useOwnHotel'
import { DEFAULT_CURRENCY, formatCurrency, formatDate, formatNumber, formatPercent, formatCompact, formatMonth } from '@/lib/formatters'

/** Formatters bound to the active language and, for hotel owners, the hotel's configured currency/date format. */
export function useFormat() {
  const { lang } = useLang()
  const { data: hotel } = useOwnHotel()
  const currency = hotel?.currency ?? DEFAULT_CURRENCY
  const pattern = hotel?.dateFormat ?? 'dd MMM yyyy'
  return {
    lang, currency,
    money: useCallback((n: number) => formatCurrency(n, lang, currency), [lang, currency]),
    num: useCallback((n: number, d = 0) => formatNumber(n, lang, d), [lang]),
    pct: useCallback((n: number) => formatPercent(n, lang), [lang]),
    date: useCallback((iso: string | null | undefined) => formatDate(iso, lang, pattern), [lang, pattern]),
    month: useCallback((ym: string) => formatMonth(ym, lang), [lang]),
    compact: useCallback((n: number) => formatCompact(n, lang), [lang]),
  }
}
