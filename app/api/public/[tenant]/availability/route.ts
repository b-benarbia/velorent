/**
 * GET /api/public/[tenant]/availability?startAt=...&endAt=...
 *
 * Endpoint public — retourne les vélos disponibles pour une plage de dates.
 * Utilisé par le widget de réservation public /[tenant]/book
 */

import { NextRequest, NextResponse }                from 'next/server'
import { prisma }                                   from '@/lib/prisma'
import { calculateMultiplier, applyMultiplier }     from '@/lib/dynamicPricing'
import type { DynamicPricingConfig }                from '@/lib/dynamicPricingConfig'
import { DEFAULT_CONFIG }                           from '@/lib/dynamicPricingConfig'

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
      },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Shop introuvable' }, { status: 404 })
    }

    // Champs ajoutés via SQL migration — non disponibles dans le client Prisma généré
    const extraRows = await prisma.$queryRaw<Array<{
      stripeSecretKey:       string | null
      dynamicPricingConfig:  unknown
    }>>`
      SELECT "stripeSecretKey", "dynamicPricingConfig"
      FROM tenants WHERE id = ${tenant.id}
    `
    const stripeSecretKey = extraRows[0]?.stripeSecretKey ?? null
    const hasStripe       = !!stripeSecretKey
    const dpConfig: DynamicPricingConfig = extraRows[0]?.dynamicPricingConfig
      ? { ...DEFAULT_CONFIG, ...(extraRows[0].dynamicPricingConfig as object) }
      : DEFAULT_CONFIG

    // Sans dates → retourne juste les infos du shop + tous les vélos dispo
    if (!startAt || !endAt) {
      const bikes = await prisma.bike.findMany({
        where: { tenantId: tenant.id, status: 'AVAILABLE' },
        select: { id: true, name: true, type: true, dailyRate: true, hourlyRate: true, imageUrl: true },
        orderBy: { type: 'asc' },
      })
      return NextResponse.json({ tenant: { ...tenant, hasStripe }, bikes, available: true })
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
        select: { id: true, bikeId: true },
      }),
    ])

    // Récupérer aussi les vélos multi-bike via rental_bikes (raw pour compat client Prisma)
    const activeRentalIds = activeRentals.map(r => r.id)
    const multiBikeRows: Array<{ bike_id: string }> = activeRentalIds.length > 0
      ? await prisma.$queryRaw`
          SELECT bike_id FROM rental_bikes WHERE rental_id = ANY(${activeRentalIds}::uuid[])
        `
      : []

    const busyBikeIds = new Set<string>([
      ...busyReservations.map(r => r.bikeId!),
      ...activeRentals.filter(r => r.bikeId).map(r => r.bikeId!),
      ...multiBikeRows.map(r => r.bike_id),
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

    // ── Tarification dynamique ────────────────────────────────────────────
    const totalBikes   = allBikes.length
    const busyCount    = busyBikeIds.size
    const utilizationRate = totalBikes > 0 ? busyCount / totalBikes : 0

    const pricing = calculateMultiplier({
      config:          dpConfig,
      startDate:       start,
      utilizationRate,
    })

    // Calculer le prix pour chaque vélo
    const bikesWithPrice = availableBikes.map(bike => {
      let basePrice: number | null = null
      const typeKey = bike.type.toLowerCase()

      // 1. Chercher dans la pricingGrid
      if (grid && grid[bike.type]?.[durationKey] != null) {
        basePrice = grid[bike.type][durationKey]
      } else if (grid && grid[typeKey]?.[durationKey] != null) {
        basePrice = grid[typeKey][durationKey]
      }

      // 2. Fallback sur dailyRate × jours
      if (basePrice === null) {
        const days = Math.max(1, Math.ceil(durationDays))
        basePrice = Number(bike.dailyRate) * days
      }

      const totalPrice = applyMultiplier(basePrice, pricing.multiplier)

      return {
        ...bike,
        dailyRate:    Number(bike.dailyRate),
        hourlyRate:   bike.hourlyRate ? Number(bike.hourlyRate) : null,
        basePrice:    Math.round(basePrice * 100) / 100,
        totalPrice,
        durationKey,
        durationHours: Math.round(durationHours * 10) / 10,
      }
    })

    // Sécurité : ne jamais renvoyer la clé secrète Stripe au client
    const tenantResponse = { ...tenant, hasStripe }

    return NextResponse.json({
      tenant:        tenantResponse,
      bikes:         bikesWithPrice,
      durationHours: Math.round(durationHours * 10) / 10,
      durationKey,
      pricing: {
        multiplier:      pricing.multiplier,
        label:           pricing.label,
        badge:           pricing.badge,
        factors:         pricing.factors,
        utilizationRate: Math.round(utilizationRate * 100),
      },
    })

  } catch (err) {
    console.error('[availability]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
