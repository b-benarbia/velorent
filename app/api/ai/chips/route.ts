import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export type ChipPriority = 'urgent' | 'warning' | 'info'
export type ChipItem = { label: string; priority: ChipPriority }

const CHIPS: Record<string, Record<string, ChipItem>> = {
  overdue: {
    fr: { label: 'Qui est en retard ?', priority: 'urgent' },
    en: { label: 'Who is overdue?', priority: 'urgent' },
    es: { label: 'Quien esta retrasado?', priority: 'urgent' },
    de: { label: 'Wer hat Verspatung?', priority: 'urgent' },
    it: { label: 'Chi e in ritardo?', priority: 'urgent' },
    nl: { label: 'Wie is te laat?', priority: 'urgent' },
    pt: { label: 'Quem esta atrasado?', priority: 'urgent' },
  },
  pending_reservations: {
    fr: { label: 'Quelles reservations confirmer ?', priority: 'warning' },
    en: { label: 'Which reservations to confirm?', priority: 'warning' },
    es: { label: 'Que reservas confirmar?', priority: 'warning' },
    de: { label: 'Welche Reservierungen bestatigen?', priority: 'warning' },
    it: { label: 'Quali prenotazioni confermare?', priority: 'warning' },
    nl: { label: 'Welke reserveringen bevestigen?', priority: 'warning' },
    pt: { label: 'Quais reservas confirmar?', priority: 'warning' },
  },
  active_rentals: {
    fr: { label: 'Qui est en location ?', priority: 'info' },
    en: { label: 'Who is currently renting?', priority: 'info' },
    es: { label: 'Quien esta alquilando?', priority: 'info' },
    de: { label: 'Wer mietet gerade?', priority: 'info' },
    it: { label: 'Chi sta noleggiando?', priority: 'info' },
    nl: { label: 'Wie huurt er nu?', priority: 'info' },
    pt: { label: 'Quem esta alugando?', priority: 'info' },
  },
  revenue_today: {
    fr: { label: "CA d'aujourd'hui ?", priority: 'info' },
    en: { label: "Today's revenue?", priority: 'info' },
    es: { label: 'Facturacion de hoy?', priority: 'info' },
    de: { label: 'Heutiger Umsatz?', priority: 'info' },
    it: { label: 'Fatturato di oggi?', priority: 'info' },
    nl: { label: 'Omzet vandaag?', priority: 'info' },
    pt: { label: 'Receita de hoje?', priority: 'info' },
  },
  revenue_month: {
    fr: { label: 'CA du mois ?', priority: 'info' },
    en: { label: 'Monthly revenue?', priority: 'info' },
    es: { label: 'Facturacion del mes?', priority: 'info' },
    de: { label: 'Monatsumsatz?', priority: 'info' },
    it: { label: 'Fatturato mensile?', priority: 'info' },
    nl: { label: 'Maandomzet?', priority: 'info' },
    pt: { label: 'Receita do mes?', priority: 'info' },
  },
  bikes_available: {
    fr: { label: 'Combien de velos disponibles ?', priority: 'info' },
    en: { label: 'How many bikes available?', priority: 'info' },
    es: { label: 'Cuantas bicis disponibles?', priority: 'info' },
    de: { label: 'Wie viele Rader verfugbar?', priority: 'info' },
    it: { label: 'Quante bici disponibili?', priority: 'info' },
    nl: { label: 'Hoeveel fietsen beschikbaar?', priority: 'info' },
    pt: { label: 'Quantas bicicletas disponiveis?', priority: 'info' },
  },
  maintenance: {
    fr: { label: 'Velos en maintenance ?', priority: 'warning' },
    en: { label: 'Bikes in maintenance?', priority: 'warning' },
    es: { label: 'Bicis en mantenimiento?', priority: 'warning' },
    de: { label: 'Rader in Wartung?', priority: 'warning' },
    it: { label: 'Bici in manutenzione?', priority: 'warning' },
    nl: { label: 'Fietsen in onderhoud?', priority: 'warning' },
    pt: { label: 'Bicicletas em manutencao?', priority: 'warning' },
  },
  upcoming_reservations: {
    fr: { label: 'Reservations demain ?', priority: 'info' },
    en: { label: 'Reservations tomorrow?', priority: 'info' },
    es: { label: 'Reservas manana?', priority: 'info' },
    de: { label: 'Reservierungen morgen?', priority: 'info' },
    it: { label: 'Prenotazioni domani?', priority: 'info' },
    nl: { label: 'Reserveringen morgen?', priority: 'info' },
    pt: { label: 'Reservas amanha?', priority: 'info' },
  },
  top_bike: {
    fr: { label: 'Velo le plus loue ?', priority: 'info' },
    en: { label: 'Most rented bike?', priority: 'info' },
    es: { label: 'Bici mas alquilada?', priority: 'info' },
    de: { label: 'Meistgemietetes Rad?', priority: 'info' },
    it: { label: 'Bici piu noleggiata?', priority: 'info' },
    nl: { label: 'Meest gehuurde fiets?', priority: 'info' },
    pt: { label: 'Bicicleta mais alugada?', priority: 'info' },
  },
}

function chip(key: string, locale: string): ChipItem {
  return CHIPS[key]?.[locale] ?? CHIPS[key]?.['fr'] ?? { label: '', priority: 'info' }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const tenantId = session.tenantId
    const locale = req.nextUrl.searchParams.get('locale') ?? 'fr'

    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowEnd = new Date(tomorrow)
    tomorrowEnd.setHours(23, 59, 59, 999)
    tomorrow.setHours(0, 0, 0, 0)

    const isEndOfMonth = now.getDate() >= 25

    const [overdueCount, pendingCount, activeCount, maintenanceCount, tomorrowResCount] =
      await Promise.all([
        prisma.rental.count({ where: { tenantId, status: 'ACTIVE', expectedReturnAt: { lt: now } } }),
        prisma.reservation.count({ where: { tenantId, status: 'PENDING' } }),
        prisma.rental.count({ where: { tenantId, status: 'ACTIVE' } }),
        prisma.bike.count({ where: { tenantId, status: 'MAINTENANCE' } }),
        prisma.reservation.count({
          where: { tenantId, status: { in: ['PENDING', 'CONFIRMED'] }, startAt: { gte: tomorrow, lte: tomorrowEnd } },
        }),
      ])

    const result: ChipItem[] = []

    if (overdueCount > 0)        result.push(chip('overdue', locale))
    if (pendingCount > 0)        result.push(chip('pending_reservations', locale))
    if (activeCount > 0)         result.push(chip('active_rentals', locale))
    if (tomorrowResCount > 0)    result.push(chip('upcoming_reservations', locale))
    result.push(isEndOfMonth ? chip('revenue_month', locale) : chip('revenue_today', locale))
    if (maintenanceCount > 0)    result.push(chip('maintenance', locale))
    result.push(chip('bikes_available', locale))
    result.push(chip('top_bike', locale))

    return NextResponse.json({ chips: result.slice(0, 4) })
  } catch (err) {
    console.error('[AI/chips]', err)
    const locale = req.nextUrl.searchParams.get('locale') ?? 'fr'
    return NextResponse.json({
      chips: [
        chip('revenue_today', locale),
        chip('active_rentals', locale),
        chip('bikes_available', locale),
        chip('top_bike', locale),
      ]
    })
  }
}
