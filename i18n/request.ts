import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export const locales = ['fr', 'en', 'es', 'de', 'it', 'nl', 'pt'] as const
export type Locale = typeof locales[number]
export const defaultLocale: Locale = 'fr'

export default getRequestConfig(async () => {
  let locale: Locale = defaultLocale
  try {
    const cookieStore = await cookies()
    const v = cookieStore.get('locale')?.value as Locale | undefined
    if (v && (locales as readonly string[]).includes(v)) locale = v
  } catch { /* prerendering — no request context */ }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
