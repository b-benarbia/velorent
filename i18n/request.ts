import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export const locales = ['fr', 'en', 'es', 'de', 'it', 'nl', 'pt'] as const
export type Locale = typeof locales[number]
export const defaultLocale: Locale = 'fr'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = (cookieStore.get('locale')?.value ?? defaultLocale) as Locale
  const validLocale = locales.includes(locale) ? locale : defaultLocale

  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.json`)).default,
  }
})
