/**
 * Bypass next-intl's server getTranslations() which requires the plugin alias
 * (broken with Turbopack in Next.js 16). This helper reads the locale directly
 * from the cookie and returns a simple key-lookup function.
 */
import { cookies } from 'next/headers'

const LOCALES = ['fr', 'en', 'es', 'de', 'it', 'nl', 'pt'] as const
type Locale = typeof LOCALES[number]
const DEFAULT_LOCALE: Locale = 'fr'

async function getLocale(): Promise<Locale> {
  try {
    const store = await cookies()
    const v = store.get('locale')?.value as Locale | undefined
    if (v && (LOCALES as readonly string[]).includes(v)) return v
  } catch {
    // prerendering — no request context
  }
  return DEFAULT_LOCALE
}

type Namespace = Record<string, string>
type AllMessages = Record<string, Namespace>

export async function getServerT(namespace: string): Promise<(key: string) => string> {
  const locale = await getLocale()
  let all: AllMessages
  try {
    all = (await import(`../messages/${locale}.json`)).default
  } catch {
    all = (await import('../messages/fr.json')).default
  }
  const ns = all[namespace] as Namespace | undefined
  return (key: string) => ns?.[key] ?? key
}
