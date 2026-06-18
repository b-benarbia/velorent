import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const rentals = await prisma.rental.findMany({
    where: { tenantId: session.tenantId },
    include: { bike: true, customer: true },
    orderBy: { startAt: 'desc' },
  })

  return NextResponse.json(rentals)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { bikeId, customerId, expectedReturnAt, depositAmount, depositPaymentMethod, amountPaid, paymentMethod, notes, openingSignature, accessories } = body

  if (!bikeId || !customerId) {
    return NextResponse.json({ error: 'Vélo et client requis' }, { status: 400 })
  }

  // Check bike belongs to tenant and is available
  const bike = await prisma.bike.findFirst({
    where: { id: bikeId, tenantId: session.tenantId },
  })
  if (!bike) return NextResponse.json({ error: 'Vélo introuvable' }, { status: 404 })
  if (bike.status !== 'AVAILABLE') {
    return NextResponse.json({ error: 'Ce vélo n\'est pas disponible' }, { status: 409 })
  }

  // Check customer belongs to tenant
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId: session.tenantId },
  })
  if (!customer) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  try {
  // Create rental + update bike in transaction
  const rental = await prisma.$transaction(async (tx) => {
    const r = await tx.rental.create({
      data: {
        tenantId: session.tenantId,
        bikeId,
        customerId,
        createdById: session.userId,
        startAt: new Date(),
        expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt) : null,
        depositAmount: depositAmount ? parseFloat(depositAmount) : 0,
        notes: notes || null,
        status: 'ACTIVE',
        source: 'WALKIN',
        paymentMethod: paymentMethod || 'CASH',
        amountPaid: amountPaid ? parseFloat(amountPaid) : null,
        openingSignature: openingSignature || null,
        contractSigned: !!openingSignature,
        accessories: accessories ?? [],
        rateSnapshot: {
          dailyRate: Number(bike.dailyRate),
          hourlyRate: bike.hourlyRate ? Number(bike.hourlyRate) : null,
          depositPaymentMethod: depositPaymentMethod ?? 'CASH',
        },
      },
      include: { bike: true, customer: true },
    })

    await tx.bike.update({ where: { id: bikeId }, data: { status: 'RENTED' } })

    return r
  })

  return NextResponse.json(rental, { status: 201 })
  } catch (err: unknown) {
    console.error('Rental create error:', err)
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
