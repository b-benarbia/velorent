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
}): string {
  const {
    locale, ownerFirstName, shopName, now,
    overdueRentals, activeCount, pendingCount, todayReturnTimes,
    yesterdayRev, lastWeekSameDayRev,
    monthRev, lastMonthRev,
    availableBikes, rentedBikes, maintenanceBikes,
    currency,
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
  lines.push('')
  lines.push(`*${t(locale, 'fleet')}*`)
  lines.push(`${availableBikes} ${t(locale, 'available')} · ${rentedBikes} ${t(locale, 'rented')} · ${maintenanceBikes} ${t(locale, 'maintenance')}`)

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

  const tenants = await prisma.tenant.findMany({
    where: { notifWhatsapp: { not: null } },
    select: { id: true, name: true, phone: true, notifLocale: true, notifWhatsapp: true, currency: true },
  })

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
        maintenanceBikes,
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
        prisma.bike.count({ where: { tenantId: tenant.id, status: 'MAINTENANCE' } }),
      ])

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
