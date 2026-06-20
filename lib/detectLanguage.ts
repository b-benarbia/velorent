/**
 * Détection automatique de la langue depuis le téléphone ou la nationalité.
 * Utilisé pour personnaliser les messages WhatsApp envoyés aux clients et aux owners.
 */

// Préfixe téléphone → locale
const PHONE_PREFIX_TO_LOCALE: [string, string][] = [
  ['+33', 'fr'],   // France
  ['+32', 'fr'],   // Belgique (francophone)
  ['+41', 'fr'],   // Suisse (on met fr par défaut, majorité)
  ['+34', 'es'],   // Espagne
  ['+52', 'es'],   // Mexique
  ['+54', 'es'],   // Argentine
  ['+56', 'es'],   // Chili
  ['+57', 'es'],   // Colombie
  ['+49', 'de'],   // Allemagne
  ['+43', 'de'],   // Autriche
  ['+39', 'it'],   // Italie
  ['+31', 'nl'],   // Pays-Bas
  ['+32', 'nl'],   // Belgique (néerlandophone — préfixe identique, on met fr en priorité)
  ['+351', 'pt'],  // Portugal
  ['+55', 'pt'],   // Brésil
  ['+44', 'en'],   // Royaume-Uni
  ['+1',  'en'],   // USA / Canada
  ['+61', 'en'],   // Australie
  ['+64', 'en'],   // Nouvelle-Zélande
  ['+353', 'en'],  // Irlande
  ['+358', 'en'],  // Finlande (anglais international)
  ['+46', 'en'],   // Suède
  ['+47', 'en'],   // Norvège
  ['+45', 'en'],   // Danemark
]

// Nationalité (chaîne libre stockée dans customer.nationality) → locale
const NATIONALITY_TO_LOCALE: Record<string, string> = {
  // Français
  french: 'fr', française: 'fr', français: 'fr', france: 'fr', fr: 'fr',
  // Espagnol
  spanish: 'es', español: 'es', espagnol: 'es', spain: 'es', espagne: 'es', españa: 'es', es: 'es',
  // Allemand
  german: 'de', deutsch: 'de', allemand: 'es', germany: 'de', allemagne: 'de', deutschland: 'de', de: 'de',
  // Italien
  italian: 'it', italiano: 'it', italien: 'it', italy: 'it', italie: 'it', italia: 'it', it: 'it',
  // Néerlandais
  dutch: 'nl', nederlands: 'nl', néerlandais: 'nl', netherlands: 'nl', holland: 'nl', nl: 'nl',
  // Portugais
  portuguese: 'pt', português: 'pt', portugais: 'pt', portugal: 'pt', pt: 'pt',
  // Anglais
  english: 'en', british: 'en', american: 'en', australian: 'en', uk: 'en', us: 'en', gb: 'en', en: 'en',
}

/**
 * Détecter la locale depuis un numéro de téléphone.
 * @param phone — ex: "+33612345678", "0612345678"
 */
export function localeFromPhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const clean = phone.replace(/\s+/g, '').replace(/^00/, '+')
  // Trier par longueur décroissante pour matcher "+351" avant "+35"
  const sorted = [...PHONE_PREFIX_TO_LOCALE].sort((a, b) => b[0].length - a[0].length)
  for (const [prefix, locale] of sorted) {
    if (clean.startsWith(prefix)) return locale
  }
  return null
}

/**
 * Détecter la locale depuis la nationalité (chaîne libre).
 * @param nationality — ex: "French", "Española", "DE", "dutch"
 */
export function localeFromNationality(nationality: string | null | undefined): string | null {
  if (!nationality) return null
  const key = nationality.trim().toLowerCase()
  return NATIONALITY_TO_LOCALE[key] ?? null
}

/**
 * Détecter la locale avec fallback chain: phone → nationality → fallback.
 */
export function detectLocale(opts: {
  phone?: string | null
  nationality?: string | null
  fallback?: string
}): string {
  return (
    localeFromPhone(opts.phone) ??
    localeFromNationality(opts.nationality) ??
    opts.fallback ??
    'en'
  )
}
