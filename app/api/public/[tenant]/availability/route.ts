/**
 * GET /api/public/[tenant]/availability?startAt=...&endAt=...
 *
 * Endpoint public — retourne les vélos disponibles pour une plage de dates.
 * Utilisé par le widget de réservation public /[tenant]/book
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: slug } = await params
    const { searchParams } = req.nextUrl
    const startAt = searchParams.get('startAt')
    const endAt   = searchParams.get('endAt')

    // Infos shop
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true, name: true, address: true, phone: true, email: true,
        website: true, logoUrl: true, currency: true,
        pricingGrid: true, depositConfig: true, insuranceConfig: true,
        stripeSecretKey: true, // pour indiquer si Stripe est actif (ne pas renvoyer la clé !)
      },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Shop introuvable' }, { status: 404 })
    }

    // Sans dates → retourne juste les infos du shop + tous les vélos dispo
    if (!startAt || !endAt) {
      const bikes = await prisma.bike.findMany({
        where: { tenantId: tenant.id, status: 'AVAILABLE' },
        select: { id: true, name: true, type: true, dailyRate: true, hourlyRate: true, imageUrl: true },
        orderBy: { type: 'asc' },
      })
      const { stripeSecretKey: sk, ...tp } = tenant as typeof tenant & { stripeSecretKey?: string }
      return NextResponse.json({ tenant: { ...tp, hasStripe: !!sk }, bikes, available: true })
    }

    const start = new Date(startAt)
    const end   = new Date(endAt)

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: 'Dates invalides' }, { status: 400 })
    }

    // Vélos occupés sur cette plage (réservations confirmées + locations actives)
    const [busyReservations, activeRentals] = await Promise.all([
      prisma.reservation.findMany({
        where: {
          tenantId: tenant.id,
          status: { in: ['CONFIRMED', 'PENDING', 'CHECKED_IN'] },
          bikeId: { not: null },
          AND: [{ startAt: { lt: end } }, { endAt: { gt: start } }],
        },
        select: { bikeId: true },
      }),
      prisma.rental.findMany({
        where: {
          tenantId: tenant.id,
          status: 'ACTIVE',
          expectedReturnAt: { gt: start },
          startAt: { lt: end },
        },
        select: { bikeId: true, bikes: { select: { bikeId: true } } },
      }),
    ])

    const busyBikeIds = new Set<string>([
      ...busyReservations.map(r => r.bikeId!),
      ...activeRentals.flatMap(r => [
        ...(r.bikeId ? [r.bikeId] : []),
        ...r.bikes.map(b => b.bikeId),
      ]),
    ])

    // Vélos disponibles
    const allBikes = await prisma.bike.findMany({
      where: { tenantId: tenant.id, status: 'AVAILABLE' },
      select: { id: true, name: true, type: true, dailyRate: true, hourlyRate: true, imageUrl: true },
      orderBy: { type: 'asc' },
    })

    const availableBikes = allBikes.filter(b => !busyBikeIds.has(b.id))

    // Calcul de la durée pour le pricing
    const durationMs   = end.getTime() - start.getTime()
    const durationHours = durationMs / (1000 * 3600)
    const durationDays  = durationMs / (1000 * 3600 * 24)

    // Déduire la clé de durée pour la pricingGrid
    function getDurationKey(hours: number): string {
      if (hours <= 1)   return '1h'
      if (hours <= 2)   return '2h'
      if (hours <= 4)   return '4h'
      if (hours <= 24)  return '1day'
      if (hours <= 48)  return '2days'
      if (hours <= 72)  return '3days'
      if (hours <= 96)  return '4days'
      if (hours <= 120) return '5days'
      if (hours <= 144) return '6days'
      return 'week'
    }

    const durationKey = getDurationKey(durationHours)
    const grid = tenant.pricingGrid as Record<string, Record<string, number>> | null

    // Calculer le prix pour chaque vélo
    const bikesWithPrice = availableBikes.map(bike => {
      let price: number | null = null
      const typeKey = bike.type.toLowerCase()

      // 1. Chercher dans la pricingGrid
      if (grid && grid[bike.type]?.[durationKey] != null) {
        price = grid[bike.type][durationKey]
      } else if (grid && grid[typeKey]?.[durationKey] != null) {
        price = grid[typeKey][durationKey]
      }

      // 2. Fallback sur dailyRate × jours
      if (price === null) {
        const days = Math.max(1, Math.ceil(durationDays))
        price = Number(bike.dailyRate) * days
      }

      return {
        ...bike,
        dailyRate: Number(bike.dailyRate),
        hourlyRate: bike.hourlyRate ? Number(bike.hourlyRate) : null,
        totalPrice: Math.round(price * 100) / 100,
        durationKey,
        durationHours: Math.round(durationHours * 10) / 10,
      }
    })

    // Sécurité : ne jamais renvoyer la clé secrète Stripe au client
    const { stripeSecretKey, ...tenantPublic } = tenant as typeof tenant & { stripeSecretKey?: string }
    const tenantResponse = { ...tenantPublic, hasStripe: !!stripeSecretKey }

    return NextResponse.json({
      tenant: tenantResponse,
      bikes: bikesWithPrice,
      durationHours: Math.round(durationHours * 10) / 10,
      durationKey,
    })

  } catch (err) {
    console.error('[availability]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
