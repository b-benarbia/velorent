import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { sendReservationConfirmedToCustomer, sendReservationCancelledToCustomer } from '@/lib/email'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const reservation = await prisma.reservation.findFirst({
    where: { id, tenantId: session.tenantId },
  })
  if (!reservation) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(reservation)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { status, cancelReason } = body

  try {
    const reservation = await prisma.reservation.update({
      where: { id, tenantId: session.tenantId },
      data: { status },
    })

    // Fetch tenant for shop name
    const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } })
    const email = reservation.customerEmail
    const bikeType = reservation.bikeType ?? 'CITY'

    if (email && tenant) {
      if (status === 'CONFIRMED') {
        void sendReservationConfirmedToCustomer({
          to: email,
          customerName: reservation.customerName,
          shopName: tenant.name,
          bikeType,
          startAt: reservation.startAt,
          endAt: reservation.endAt,
          notes: reservation.notes,
        })
      } else if (status === 'CANCELLED') {
        void sendReservationCancelledToCustomer({
          to: email,
          customerName: reservation.customerName,
          shopName: tenant.name,
          bikeType,
          startAt: reservation.startAt,
          cancelReason: cancelReason ?? null,
        })
      }
    }

    return NextResponse.json(reservation)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
