import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const reservations = await prisma.reservation.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { startAt: 'desc' },
    take: 50,
    include: {
      bike: { select: { name: true, code: true } },
    },
  })

  return NextResponse.json(reservations)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const body = await req.json()
    const { customerName, customerPhone, customerEmail, bikeId, startAt, endAt, notes } = body

    if (!customerName || !startAt || !endAt) {
      return NextResponse.json({ error: 'Nom, début et fin requis' }, { status: 400 })
    }

    const reservation = await prisma.reservation.create({
      data: {
        tenantId: session.tenantId,
        customerName,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || '',
        bikeId: bikeId || null,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        notes: notes || null,
        source: 'WALKIN',
      },
      include: {
        bike: { select: { name: true, code: true } },
      },
    })

    return NextResponse.json(reservation, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
