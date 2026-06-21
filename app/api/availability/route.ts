import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import type { BikeType } from '@/app/generated/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
  const sp         = new URL(req.url).searchParams
  const bikeType   = sp.get('bikeType') as BikeType | null
  const bikeId     = sp.get('bikeId')
  const start      = sp.get('start')
  const end        = sp.get('end')
  const excludeId  = sp.get('excludeId') // reservation ID to exclude from count

  if (!start || !end || (!bikeType && !bikeId)) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const tenantId = session.tenantId
  const startDt  = new Date(start)
  const endDt    = new Date(end)

  // ── Case 1: specific bikeId ─────────────────────────────────────────────────
  if (bikeId) {
    const bike = await prisma.bike.findFirst({ where: { id: bikeId, tenantId } })
    if (!bike) return NextResponse.json({ total: 0, booked: 0, available: 0 })

    if (bike.status === 'MAINTENANCE' || bike.status === 'RETIRED') {
      return NextResponse.json({ total: 1, booked: 1, available: 0 })
    }

    // Active/overdue rentals that started before our end (haven't returned)
    const activeConflict = await prisma.rental.count({
      where: { bikeId, tenantId, status: { in: ['ACTIVE', 'OVERDUE'] }, startAt: { lt: endDt } },
    })
    // Completed rentals that overlap our window
    const completedConflict = await prisma.rental.count({
      where: { bikeId, tenantId, status: 'COMPLETED', startAt: { lt: endDt }, endAt: { gt: startDt } },
    })
    // Other pending/confirmed reservations on the same bike that overlap
    const resConflict = await prisma.reservation.count({
      where: {
        bikeId,
        tenantId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startAt: { lt: endDt },
        endAt:   { gt: startDt },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    })

    const booked = (activeConflict + completedConflict + resConflict) > 0 ? 1 : 0
    return NextResponse.json({ total: 1, booked, available: 1 - booked })
  }

  // ── Case 2: bikeType (no specific bike assigned) ────────────────────────────
  // Total usable bikes of this type
  const total = await prisma.bike.count({
    where: { tenantId, type: bikeType!, status: { notIn: ['MAINTENANCE', 'RETIRED'] } },
  })
  if (total === 0) return NextResponse.json({ total: 0, booked: 0, available: 0 })

  // Bikes physically occupied by active/overdue rentals (not yet returned)
  const activeRentals = await prisma.rental.findMany({
    where: {
      tenantId,
      status: { in: ['ACTIVE', 'OVERDUE'] },
      startAt: { lt: endDt },
      bike: { type: bikeType! },
    },
    select: { bikeId: true },
  })

  // Bikes occupied by completed rentals overlapping our window
  const completedRentals = await prisma.rental.findMany({
    where: {
      tenantId,
      status: 'COMPLETED',
      startAt: { lt: endDt },
      endAt:   { gt: startDt },
      bike: { type: bikeType! },
    },
    select: { bikeId: true },
  })

  // Reservations with a specific bikeId of this type overlapping our window
  const specificBikeRes = await prisma.reservation.findMany({
    where: {
      tenantId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startAt: { lt: endDt },
      endAt:   { gt: startDt },
      bikeId:  { not: null },
      bike:    { type: bikeType! },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { bikeId: true },
  })

  // Distinct bike IDs physically blocked
  const blockedBikeIds = new Set<string>()
  activeRentals.forEach(r  => { if (r.bikeId) blockedBikeIds.add(r.bikeId) })
  completedRentals.forEach(r => { if (r.bikeId) blockedBikeIds.add(r.bikeId) })
  specificBikeRes.forEach(r => { if (r.bikeId) blockedBikeIds.add(r.bikeId) })

  // Type-level reservations (no specific bike) overlapping — each consumes one slot
  const typeResCount = await prisma.reservation.count({
    where: {
      tenantId,
      bikeType: bikeType!,
      bikeId:   null,
      status:   { in: ['PENDING', 'CONFIRMED'] },
      startAt:  { lt: endDt },
      endAt:    { gt: startDt },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  })

  const booked    = Math.min(total, blockedBikeIds.size + typeResCount)
  const available = Math.max(0, total - booked)

  return NextResponse.json({ total, booked, available })
  } catch (e) {
    console.error('[availability GET]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
