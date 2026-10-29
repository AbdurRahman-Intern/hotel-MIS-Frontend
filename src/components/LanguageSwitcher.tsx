import { Languages } from 'lucide-react'
import { LANGUAGES } from '@/i18n'
import { useLang } from '@/hooks/useLang'
import { cn } from '@/lib/cn'

/** Same control on login, Super Admin and Hotel Owner headers. Language never depends on role/tenant. */
export function LanguageSwitcher({ dark }: { dark?: boolean }) {
  const { lang, setLang } = useLang()
  return (
    <div className={cn('flex items-center gap-1 rounded-lg border p-0.5 text-sm', dark ? 'border-white/20 bg-white/5' : 'border-line bg-white')} role="group" aria-label="Language">
      <Languages className={cn('mx-1.5 size-4', dark ? 'text-white/70' : 'text-muted')} aria-hidden />
      {LANGUAGES.map((l) => (
        <button key={l.code} type="button" onClick={() => setLang(l.code)} aria-pressed={lang === l.code} lang={l.code}
          className={cn('rounded-md px-2.5 py-1 font-medium transition', lang === l.code ? 'bg-brand-600 text-white' : dark ? 'text-white/80 hover:bg-white/10' : 'text-muted hover:bg-slate-100')}>
          {l.label}
        </button>
      ))}
    </div>
  )
}
