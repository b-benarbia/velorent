/**
 * GET /api/public/[tenant]/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Retourne les dates où AUCUN vélo n'est disponible (flotte 100% occupée).
 * Utilisé par le widget de réservation pour griser les dates indisponibles.
 *
 * Réponse : { blockedDates: ['2026-07-15', '2026-07-16', ...] }
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: slug } = await params
    const { searchParams } = req.nextUrl

    const fromStr = searchParams.get('from')
    const toStr   = searchParams.get('to')

    if (!fromStr || !toStr) {
      return NextResponse.json({ blockedDates: [] })
    }

    const fromDate = new Date(fromStr + 'T00:00:00')
    const toDate   = new Date(toStr  + 'T23:59:59')

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ blockedDates: [] })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!tenant) return NextResponse.json({ blockedDates: [] })

    // Nombre total de vélos actifs dans la flotte
    const totalBikes = await prisma.bike.count({
      where: { tenantId: tenant.id, status: 'AVAILABLE' },
    })

    // Si pas de vélos → toutes les dates sont "bloquées" (ou on retourne vide)
    if (totalBikes === 0) return NextResponse.json({ blockedDates: [] })

    // Toutes les réservations + locations actives qui chevauchent la plage
    const [reservations, activeRentals] = await Promise.all([
      prisma.reservation.findMany({
        where: {
          tenantId: tenant.id,
          status: { in: ['CONFIRMED', 'PENDING', 'CHECKED_IN'] },
          bikeId: { not: null },
          AND: [{ startAt: { lt: toDate } }, { endAt: { gt: fromDate } }],
        },
        select: { bikeId: true, startAt: true, endAt: true },
      }),
      prisma.rental.findMany({
        where: {
          tenantId: tenant.id,
          status: 'ACTIVE',
          expectedReturnAt: { gt: fromDate },
          startAt: { lt: toDate },
        },
        select: { id: true, bikeId: true, startAt: true, expectedReturnAt: true },
      }),
    ])

    // Récupérer les vélos multi-bike via rental_bikes (raw pour compat client Prisma)
    const activeRentalIds = activeRentals.map(r => r.id)
    const multiBikeRows: Array<{ rental_id: string; bike_id: string }> = activeRentalIds.length > 0
      ? await prisma.$queryRaw`
          SELECT rental_id, bike_id FROM rental_bikes WHERE rental_id = ANY(${activeRentalIds}::uuid[])
        `
      : []

    // Normaliser en liste d'intervalles { bikeId, start, end }
    type Interval = { bikeId: string; start: Date; end: Date }
    const intervals: Interval[] = [
      ...reservations
        .filter(r => r.bikeId)
        .map(r => ({ bikeId: r.bikeId!, start: r.startAt, end: r.endAt })),
      ...activeRentals.flatMap(r => {
        const end = r.expectedReturnAt ?? toDate
        const bikeIds = [
          ...(r.bikeId ? [r.bikeId] : []),
          ...multiBikeRows.filter(mb => mb.rental_id === r.id).map(mb => mb.bike_id),
        ]
        return bikeIds.map(id => ({ bikeId: id, start: r.startAt, end }))
      }),
    ]

    // Pour chaque jour de la plage, compter les vélos occupés
    const blockedDates: string[] = []
    const cursor = new Date(fromDate)
    cursor.setHours(0, 0, 0, 0)

    while (cursor <= toDate) {
      const dayStart = new Date(cursor)
      const dayEnd   = new Date(cursor)
      dayEnd.setHours(23, 59, 59, 999)

      // Vélos uniques occupés ce jour
      const busyIds = new Set(
        intervals
          .filter(i => i.start < dayEnd && i.end > dayStart)
          .map(i => i.bikeId)
      )

      if (busyIds.size >= totalBikes) {
        blockedDates.push(toDateStr(cursor))
      }

      cursor.setDate(cursor.getDate() + 1)
    }

    // Cache 5 min côté CDN
    return NextResponse.json(
      { blockedDates },
      { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } }
    )

  } catch (err) {
    console.error('[calendar]', err)
    return NextResponse.json({ blockedDates: [] })
  }
}
