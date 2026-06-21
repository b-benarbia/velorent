/**
 * Briefing matinal premium — tourne chaque jour à 8h (Vercel Cron)
 *
 * Format premium :
 *  - Prénom du gérant (personnalisé)
 *  - Urgences EN PREMIER si retards (avec durée exacte)
 *  - Revenus avec % vs semaine dernière + projection du mois
 *  - Flotte en une ligne
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsApp, isWhatsAppConfigured } from '@/lib/whatsapp'
import { detectLocale } from '@/lib/detectLanguage'

// ── Labels par langue ────────────────────────────────────────────────────────

const L: Record<string, Record<string, string>> = {
  fr: {
    hello: 'Bonjour',
    urgent: '🚨 URGENT —',
    overdueLabel: 'vélo en retard',
    overduesLabel: 'vélos en retard',
    situation: '📍 Situation',
    active: 'locations actives',
    pending: 'réservations à confirmer',
    returnsToday: 'Retours aujourd\'hui',
    none: 'aucun',
    revenue: '💰 Revenus',
    yesterday: 'Hier',
    month: 'Ce mois',
    projection: 'Projection',
    vsLastWeek: 'vs sem. dernière',
    fleet: '🚲 Flotte',
    available: 'dispo',
    rented: 'loués',
    maintenance: 'maintenance',
    footer: '— VeloRent',
    late: 'de retard',
    utilization: 'Taux d\'occupation',
    dormantAlert: '💤 Vélos dormants (>14j sans location)',
    dpSuggestion: '💡 Conseil IA',
    dpHighUtil: 'Votre flotte est saturée à',
    dpSuggestEnable: '→ Activez la tarification dynamique pour maximiser vos revenus ce soir.',
    dpLowUtil: 'Flotte peu occupée',
    dpSuggestDiscount: '→ Activez une réduction automatique pour attirer plus de clients.',
    maintenanceDetail: '🔧 En maintenance',
  },
  es: {
    hello: 'Hola',
    urgent: '🚨 URGENTE —',
    overdueLabel: 'bici con retraso',
    overduesLabel: 'bicis con retraso',
    situation: '📍 Situación',
    active: 'alquileres activos',
    pending: 'reservas por confirmar',
    returnsToday: 'Devoluciones hoy',
    none: 'ninguno',
    revenue: '💰 Ingresos',
    yesterday: 'Ayer',
    month: 'Este mes',
    projection: 'Proyección',
    vsLastWeek: 'vs sem. pasada',
    fleet: '🚲 Flota',
    available: 'disponibles',
    rented: 'alquiladas',
    maintenance: 'mantenimiento',
    footer: '— VeloRent',
    late: 'de retraso',
    utilization: 'Tasa de ocupación',
    dormantAlert: '💤 Bicis dormidas (>14d sin alquilar)',
    dpSuggestion: '💡 Consejo IA',
    dpHighUtil: 'Tu flota está saturada al',
    dpSuggestEnable: '→ Activa la tarificación dinámica para maximizar ingresos.',
    dpLowUtil: 'Flota poco ocupada',
    dpSuggestDiscount: '→ Activa un descuento automático para atraer más clientes.',
    maintenanceDetail: '🔧 En mantenimiento',
  },
  en: {
    hello: 'Hello',
    urgent: '🚨 URGENT —',
    overdueLabel: 'bike overdue',
    overduesLabel: 'bikes overdue',
    situation: '📍 Situation',
    active: 'active rentals',
    pending: 'reservations to confirm',
    returnsToday: 'Returns today',
    none: 'none',
    revenue: '💰 Revenue',
    yesterday: 'Yesterday',
    month: 'This month',
    projection: 'Projection',
    vsLastWeek: 'vs last week',
    fleet: '🚲 Fleet',
    available: 'available',
    rented: 'rented',
    maintenance: 'maintenance',
    footer: '— VeloRent',
    late: 'overdue',
    utilization: 'Utilization rate',
    dormantAlert: '💤 Idle bikes (>14d without rental)',
    dpSuggestion: '💡 AI Tip',
    dpHighUtil: 'Your fleet is',
    dpSuggestEnable: '→ Enable dynamic pricing to maximize revenue tonight.',
    dpLowUtil: 'Fleet underutilized',
    dpSuggestDiscount: '→ Enable auto-discount to attract more customers.',
    maintenanceDetail: '🔧 In maintenance',
  },
  de: {
    hello: 'Hallo',
    urgent: '🚨 DRINGEND —',
    overdueLabel: 'Rad überfällig',
    overduesLabel: 'Räder überfällig',
    situation: '📍 Lage',
    active: 'aktive Mietverträge',
    pending: 'Reservierungen zu bestätigen',
    returnsToday: 'Rückgaben heute',
    none: 'keine',
    revenue: '💰 Umsatz',
    yesterday: 'Gestern',
    month: 'Diesen Monat',
    projection: 'Prognose',
    vsLastWeek: 'vs letzte Woche',
    fleet: '🚲 Flotte',
    available: 'verfügbar',
    rented: 'vermietet',
    maintenance: 'Wartung',
    footer: '— VeloRent',
    late: 'überfällig',
    utilization: 'Auslastungsrate',
    dormantAlert: '💤 Ruhende Räder (>14T ohne Buchung)',
    dpSuggestion: '💡 KI-Tipp',
    dpHighUtil: 'Ihre Flotte ist zu',
    dpSuggestEnable: '→ Aktivieren Sie dynamische Preise für mehr Umsatz.',
    dpLowUtil: 'Flotte wenig ausgelastet',
    dpSuggestDiscount: '→ Automatischen Rabatt aktivieren.',
    maintenanceDetail: '🔧 In Wartung',
  },
  it: {
    hello: 'Ciao',
    urgent: '🚨 URGENTE —',
    overdueLabel: 'bici in ritardo',
    overduesLabel: 'bici in ritardo',
    situation: '📍 Situazione',
    active: 'noleggi attivi',
    pending: 'prenotazioni da confermare',
    returnsToday: 'Restituzioni oggi',
    none: 'nessuno',
    revenue: '💰 Ricavi',
    yesterday: 'Ieri',
    month: 'Questo mese',
    projection: 'Proiezione',
    vsLastWeek: 'vs settimana scorsa',
    fleet: '🚲 Flotta',
    available: 'disponibili',
    rented: 'noleggiate',
    maintenance: 'manutenzione',
    footer: '— VeloRent',
    late: 'in ritardo',
    utilization: 'Tasso di utilizzo',
    dormantAlert: '💤 Bici inattive (>14g senza noleggio)',
    dpSuggestion: '💡 Consiglio IA',
    dpHighUtil: 'La tua flotta è occupata al',
    dpSuggestEnable: '→ Attiva la tariffazione dinamica.',
    dpLowUtil: 'Flotta poco occupata',
    dpSuggestDiscount: '→ Attiva uno sconto automatico.',
    maintenanceDetail: '🔧 In manutenzione',
  },
  nl: {
    hello: 'Hallo',
    urgent: '🚨 DRINGEND —',
    overdueLabel: 'fiets te laat',
    overduesLabel: 'fietsen te laat',
    situation: '📍 Situatie',
    active: 'actieve verhuur',
    pending: 'reserveringen te bevestigen',
    returnsToday: 'Teruggaves vandaag',
    none: 'geen',
    revenue: '💰 Omzet',
    yesterday: 'Gisteren',
    month: 'Deze maand',
    projection: 'Prognose',
    vsLastWeek: 'vs vorige week',
    fleet: '🚲 Vloot',
    available: 'beschikbaar',
    rented: 'verhuurd',
    maintenance: 'onderhoud',
    footer: '— VeloRent',
    late: 'te laat',
    utilization: 'Bezettingsgraad',
    dormantAlert: '💤 Slapende fietsen (>14d zonder verhuur)',
    dpSuggestion: '💡 AI Tip',
    dpHighUtil: 'Uw vloot is voor',
    dpSuggestEnable: '→ Activeer dynamische prijzen.',
    dpLowUtil: 'Vloot weinig bezet',
    dpSuggestDiscount: '→ Activeer automatische korting.',
    maintenanceDetail: '🔧 In onderhoud',
  },
  pt: {
    hello: 'Olá',
    urgent: '🚨 URGENTE —',
    overdueLabel: 'bicicleta em atraso',
    overduesLabel: 'bicicletas em atraso',
    situation: '📍 Situação',
    active: 'aluguéis ativos',
    pending: 'reservas para confirmar',
    returnsToday: 'Devoluções hoje',
    none: 'nenhum',
    revenue: '💰 Receitas',
    yesterday: 'Ontem',
    month: 'Este mês',
    projection: 'Projeção',
    vsLastWeek: 'vs semana passada',
    fleet: '🚲 Frota',
    available: 'disponíveis',
    rented: 'alugadas',
    maintenance: 'manutenção',
    footer: '— VeloRent',
    late: 'em atraso',
    utilization: 'Taxa de ocupação',
    dormantAlert: '💤 Bikes paradas (>14d sem aluguel)',
    dpSuggestion: '💡 Dica IA',
    dpHighUtil: 'Sua frota está a',
    dpSuggestEnable: '→ Ative a precificação dinâmica.',
    dpLowUtil: 'Frota pouco ocupada',
    dpSuggestDiscount: '→ Ative desconto automático.',
    maintenanceDetail: '🔧 Em manutenção',
  },
}

function t(locale: string, key: string): string {
  return L[locale]?.[key] ?? L['en'][key] ?? key
}

const DATE_LOCALE: Record<string, string> = {
  fr: 'fr-FR', es: 'es-ES', en: 'en-GB',
  de: 'de-DE', it: 'it-IT', nl: 'nl-NL', pt: 'pt-PT',
}

function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000)
  if (totalMin < 60) return `+${totalMin}min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `+${h}h${m.toString().padStart(2, '0')}` : `+${h}h`
}

function formatPct(current: number, previous: number): string {
  if (previous === 0) return ''
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return ''
  return pct > 0 ? `  ↑ +${pct}%` : `  ↓ ${pct}%`
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

// ── Génération du message ────────────────────────────────────────────────────

function buildMessage(opts: {
  locale: string
  ownerFirstName: string
  shopName: string
  now: Date
  overdueRentals: { name: string; bikeName: string; lateMs: number }[]
  activeCount: number
  pendingCount: number
  todayReturnTimes: string[]
  yesterdayRev: number
  lastWeekSameDayRev: number
  monthRev: number
  lastMonthRev: number
  availableBikes: number
  rentedBikes: number
  maintenanceBikes: number
  currency: string
  // Nouvelles données enrichies
  dormantBikeNames: string[]
  maintenanceBikeNames: string[]
  dpEnabled: boolean
}): string {
  const {
    locale, ownerFirstName, shopName, now,
    overdueRentals, activeCount, pendingCount, todayReturnTimes,
    yesterdayRev, lastWeekSameDayRev,
    monthRev, lastMonthRev,
    availableBikes, rentedBikes, maintenanceBikes,
    currency,
    dormantBikeNames, maintenanceBikeNames, dpEnabled,
  } = opts

  const fmt = (n: number) => `${Math.round(n)}${currency}`
  const dateStr = now.toLocaleDateString(DATE_LOCALE[locale] ?? 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const lines: string[] = []

  // Greeting personnalisé
  lines.push(`👋 ${t(locale, 'hello')} ${ownerFirstName}`)
  lines.push('')
  lines.push(`☀️ ${dateStr} · ${shopName}`)

  // ── URGENCES EN PREMIER ──
  if (overdueRentals.length > 0) {
    lines.push('')
    const label = overdueRentals.length === 1 ? t(locale, 'overdueLabel') : t(locale, 'overduesLabel')
    lines.push(`*${t(locale, 'urgent')} ${overdueRentals.length} ${label}*`)
    overdueRentals.forEach(r => {
      lines.push(`${r.name} · ${r.bikeName} · ${formatDuration(r.lateMs)} ${t(locale, 'late')}`)
    })
  }

  // ── SITUATION ──
  lines.push('')
  lines.push(`*${t(locale, 'situation')}*`)
  lines.push(`· ${activeCount} ${t(locale, 'active')}`)
  if (pendingCount > 0) {
    lines.push(`· ${pendingCount} ${t(locale, 'pending')}`)
  }
  lines.push(`· ${t(locale, 'returnsToday')} : ${todayReturnTimes.length > 0 ? todayReturnTimes.join(', ') : t(locale, 'none')}`)

  // ── REVENUS ──
  lines.push('')
  lines.push(`*${t(locale, 'revenue')}*`)

  const pctVsLastWeek = formatPct(yesterdayRev, lastWeekSameDayRev)
  lines.push(`· ${t(locale, 'yesterday')} : ${fmt(yesterdayRev)}${pctVsLastWeek ? `  ${pctVsLastWeek} ${t(locale, 'vsLastWeek')}` : ''}`)

  // Projection mois en cours
  const dayOfMonth = now.getDate()
  const totalDays  = daysInMonth(now)
  const projected  = dayOfMonth > 0 ? Math.round((monthRev / dayOfMonth) * totalDays) : 0
  const projectionPct = lastMonthRev > 0 ? formatPct(projected, lastMonthRev) : ''
  lines.push(`· ${t(locale, 'month')} : ${fmt(monthRev)}  →  📈 ${t(locale, 'projection')} ~${fmt(projected)}${projectionPct ? `  ${projectionPct} vs mois dernier` : ''}`)

  // ── FLOTTE ──
  const totalBikes = availableBikes + rentedBikes + maintenanceBikes
  const utilizationRate = totalBikes > 0 ? Math.round((rentedBikes / totalBikes) * 100) : 0
  lines.push('')
  lines.push(`*${t(locale, 'fleet')}*`)
  lines.push(`${availableBikes} ${t(locale, 'available')} · ${rentedBikes} ${t(locale, 'rented')} · ${maintenanceBikes} ${t(locale, 'maintenance')}`)
  lines.push(`${t(locale, 'utilization')} : ${utilizationRate}% ${'█'.repeat(Math.round(utilizationRate / 10))}${'░'.repeat(10 - Math.round(utilizationRate / 10))}`)

  // Vélos en maintenance depuis trop longtemps
  if (maintenanceBikeNames.length > 0) {
    lines.push(`${t(locale, 'maintenanceDetail')} : ${maintenanceBikeNames.slice(0, 3).join(', ')}`)
  }

  // Vélos dormants (AVAILABLE mais pas loués depuis 14j+)
  if (dormantBikeNames.length > 0) {
    lines.push('')
    lines.push(`*${t(locale, 'dormantAlert')}*`)
    lines.push(dormantBikeNames.slice(0, 4).join(', '))
  }

  // ── CONSEIL IA DYNAMIQUE ──
  if (utilizationRate >= 80 && !dpEnabled) {
    lines.push('')
    lines.push(`*${t(locale, 'dpSuggestion')}*`)
    lines.push(`${t(locale, 'dpHighUtil')} ${utilizationRate}% ! ${t(locale, 'dpSuggestEnable')}`)
  } else if (utilizationRate <= 30 && !dpEnabled && totalBikes >= 3) {
    lines.push('')
    lines.push(`*${t(locale, 'dpSuggestion')}*`)
    lines.push(`${t(locale, 'dpLowUtil')} (${utilizationRate}%). ${t(locale, 'dpSuggestDiscount')}`)
  }

  lines.push('')
  lines.push(t(locale, 'footer'))

  return lines.join('\n')
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ error: 'WhatsApp non configuré (TWILIO_* manquants)' }, { status: 500 })
  }

  const now          = new Date()
  const todayStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd     = new Date(todayStart.getTime() + 24 * 3600 * 1000 - 1)
  const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
  const yesterday      = new Date(todayStart.getTime() - 24 * 3600 * 1000)
  const lastWeekSameDay     = new Date(todayStart.getTime() - 7 * 24 * 3600 * 1000)
  const lastWeekSameDayEnd  = new Date(yesterday.getTime() - 6 * 24 * 3600 * 1000)
  const tomorrow    = new Date(todayStart.getTime() + 24 * 3600 * 1000)
  const tomorrowEnd = new Date(tomorrow.getTime() + 24 * 3600 * 1000 - 1)

  // notifWhatsapp ajouté via migration SQL → pas dans le client Prisma généré
  const tenants = await prisma.$queryRaw<Array<{
    id: string
    name: string
    phone: string | null
    notifLocale: string
    notifWhatsapp: string
    currency: string
  }>>`
    SELECT id, name, phone, "notifLocale", "notifWhatsapp", currency
    FROM tenants
    WHERE "notifWhatsapp" IS NOT NULL
  `

  const results: { tenant: string; status: string }[] = []

  for (const tenant of tenants) {
    try {
      const locale = tenant.notifLocale || detectLocale({ phone: tenant.phone, fallback: 'es' })
      const cur    = tenant.currency ?? 'EUR'

      // Récupérer le prénom du owner
      const owner = await prisma.user.findFirst({
        where: { tenantId: tenant.id, role: 'OWNER' },
        select: { name: true },
      })
      const ownerFirstName = (owner?.name ?? '').split(' ')[0] || 'vous'

      const dormantThreshold  = new Date(now.getTime() - 14 * 24 * 3600 * 1000) // 14j

      const [
        overdueRentalsRaw,
        activeCount,
        pendingCount,
        todayReturns,
        yesterdayRevAgg,
        lastWeekSameDayRevAgg,
        monthRevAgg,
        lastMonthRevAgg,
        tomorrowCount,
        availableBikes,
        rentedBikes,
        maintenanceBikesRaw,
        dormantBikes,
      ] = await Promise.all([
        prisma.rental.findMany({
          where: { tenantId: tenant.id, status: 'ACTIVE', expectedReturnAt: { lt: now } },
          include: { customer: true, bikes: { include: { bike: true }, take: 1 }, bike: true },
          orderBy: { expectedReturnAt: 'asc' },
          take: 5,
        }),
        prisma.rental.count({ where: { tenantId: tenant.id, status: 'ACTIVE' } }),
        prisma.reservation.count({ where: { tenantId: tenant.id, status: 'PENDING' } }),
        prisma.rental.findMany({
          where: { tenantId: tenant.id, status: 'ACTIVE', expectedReturnAt: { gte: now, lte: todayEnd } },
          select: { expectedReturnAt: true },
          orderBy: { expectedReturnAt: 'asc' },
          take: 5,
        }),
        prisma.invoice.aggregate({ where: { tenantId: tenant.id, issuedAt: { gte: yesterday, lt: todayStart } }, _sum: { amountTtc: true } }),
        prisma.invoice.aggregate({ where: { tenantId: tenant.id, issuedAt: { gte: lastWeekSameDay, lt: lastWeekSameDayEnd } }, _sum: { amountTtc: true } }),
        prisma.invoice.aggregate({ where: { tenantId: tenant.id, issuedAt: { gte: monthStart } }, _sum: { amountTtc: true } }),
        prisma.invoice.aggregate({ where: { tenantId: tenant.id, issuedAt: { gte: lastMonthStart, lt: lastMonthEnd } }, _sum: { amountTtc: true } }),
        prisma.reservation.count({ where: { tenantId: tenant.id, status: { in: ['PENDING', 'CONFIRMED'] }, startAt: { gte: tomorrow, lt: tomorrowEnd } } }),
        prisma.bike.count({ where: { tenantId: tenant.id, status: 'AVAILABLE' } }),
        prisma.bike.count({ where: { tenantId: tenant.id, status: 'RENTED' } }),
        // Vélos en maintenance avec leur nom
        prisma.bike.findMany({
          where: { tenantId: tenant.id, status: 'MAINTENANCE' },
          select: { name: true },
          take: 5,
        }),
        // Vélos AVAILABLE dont la dernière location remonte à >14j (dormants)
        prisma.bike.findMany({
          where: {
            tenantId: tenant.id,
            status: 'AVAILABLE',
            OR: [
              // Jamais loués
              { rentals: { none: {} } },
              // Dernière location terminée il y a plus de 14j
              { rentals: { every: { endAt: { lt: dormantThreshold } } } },
            ],
          },
          select: { name: true },
          take: 5,
        }),
      ])

      // Config tarification dynamique — colonne optionnelle (migration récente)
      let dpEnabled = false
      try {
        const dpRows = await prisma.$queryRaw<Array<{ dynamicPricingConfig: unknown }>>`
          SELECT "dynamicPricingConfig" FROM tenants WHERE id = ${tenant.id}
        `
        const dpConfig = dpRows[0]?.dynamicPricingConfig as { enabled?: boolean } | null
        dpEnabled = !!(dpConfig?.enabled)
      } catch { /* colonne pas encore migrée */ }

      const maintenanceBikes = maintenanceBikesRaw.length

      const overdueRentals = overdueRentalsRaw.map(r => ({
        name: `${r.customer.firstName} ${r.customer.lastName[0]}.`,
        bikeName: r.bikes?.[0]?.bike?.name ?? r.bike?.name ?? '—',
        lateMs: now.getTime() - new Date(r.expectedReturnAt!).getTime(),
      }))

      const todayReturnTimes = todayReturns
        .filter(r => r.expectedReturnAt)
        .map(r => new Date(r.expectedReturnAt!).toLocaleTimeString(DATE_LOCALE[locale] ?? 'en-GB', { hour: '2-digit', minute: '2-digit' }))

      const message = buildMessage({
        locale,
        ownerFirstName,
        shopName: tenant.name,
        now,
        overdueRentals,
        activeCount,
        pendingCount,
        todayReturnTimes,
        yesterdayRev:         Number(yesterdayRevAgg._sum.amountTtc ?? 0),
        lastWeekSameDayRev:   Number(lastWeekSameDayRevAgg._sum.amountTtc ?? 0),
        monthRev:             Number(monthRevAgg._sum.amountTtc ?? 0),
        lastMonthRev:         Number(lastMonthRevAgg._sum.amountTtc ?? 0),
        availableBikes,
        rentedBikes,
        maintenanceBikes,
        currency: cur,
        dormantBikeNames: dormantBikes.map(b => b.name),
        maintenanceBikeNames: maintenanceBikesRaw.map(b => b.name),
        dpEnabled,
      })

      await sendWhatsApp(tenant.notifWhatsapp!, message)
      results.push({ tenant: tenant.name, status: 'sent' })

    } catch (err) {
      console.error(`[morning-briefing] Erreur pour ${tenant.name}:`, err)
      results.push({ tenant: tenant.name, status: 'error' })
    }
  }

  return NextResponse.json({ sent: results.length, results })
}
