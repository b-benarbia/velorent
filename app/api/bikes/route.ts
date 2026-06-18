import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const bikes = await prisma.bike.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { code: 'asc' },
  })

  return NextResponse.json(bikes)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { code, name, type, dailyRate, hourlyRate, serialNumber, notes } = body

  if (!code || !name || !type || !dailyRate) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  // Check code unique per tenant
  const existing = await prisma.bike.findFirst({
    where: { tenantId: session.tenantId, code },
  })
  if (existing) {
    return NextResponse.json({ error: `Le code "${code}" existe déjà` }, { status: 409 })
  }

  const bike = await prisma.bike.create({
    data: {
      tenantId: session.tenantId,
      code,
      name,
      type,
      dailyRate: parseFloat(dailyRate),
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      serialNumber: serialNumber || null,
      notes: notes || null,
      status: 'AVAILABLE',
    },
  })

  return NextResponse.json(bike, { status: 201 })
}
