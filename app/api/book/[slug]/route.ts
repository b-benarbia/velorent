import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendBookingConfirmationToCustomer, sendBookingAlertToShop } from '@/lib/email'

// GET — shop info + available bike types
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const bikes = await prisma.bike.findMany({
    where: { tenantId: tenant.id, status: { not: 'RETIRED' } },
    select: { type: true },
  })

  const availableTypes = [...new Set(bikes.map(b => b.type))]

  return NextResponse.json({ name: tenant.name, slug: tenant.slug, availableTypes })
}

// POST — create reservation (public, no auth)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = await req.json()
  const { firstName, lastName, phone, email, address, bikeType, bikeQty = 1, startAt, endAt, notes, accessories } = body

  if (!firstName || !lastName || !phone || !bikeType || !startAt || !endAt) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant) return NextResponse.json({ error: 'Shop introuvable' }, { status: 404 })

  const bikeQtyLine = bikeQty > 1 ? `${bikeQty} vélos` : null
  const accessoryLine = accessories && Object.keys(accessories).length
    ? `Accessoires: ${Object.entries(accessories).map(([k, v]) => `${v}x ${k}`).join(', ')}`
    : null
  const fullNotes = [bikeQtyLine, accessoryLine, notes].filter(Boolean).join(' — ') || null

  const reservation = await prisma.reservation.create({
    data: {
      tenantId: tenant.id,
      customerName: `${firstName} ${lastName}`,
      customerPhone: phone || null,
      customerEmail: email || '',
      customerAddress: address?.trim() || null,
      bikeType: bikeType as any,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      notes: fullNotes,
      status: 'PENDING',
      source: 'ONLINE',
    },
  })

  // Emails en arrière-plan (ne bloque pas la réponse)
  const startDate = new Date(startAt)
  const endDate = new Date(endAt)

  void Promise.allSettled([
    email
      ? sendBookingConfirmationToCustomer({
          to: email,
          customerName: `${firstName} ${lastName}`,
          shopName: tenant.name,
          bikeType,
          startAt: startDate,
          endAt: endDate,
          notes: fullNotes,
        })
      : Promise.resolve(),
    tenant.email
      ? sendBookingAlertToShop({
          shopEmail: tenant.email,
          shopName: tenant.name,
          customerName: `${firstName} ${lastName}`,
          customerPhone: phone,
          customerEmail: email,
          bikeType,
          startAt: startDate,
          endAt: endDate,
          notes: fullNotes,
        })
      : Promise.resolve(),
  ])

  return NextResponse.json(reservation, { status: 201 })
}
