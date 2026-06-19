import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { sendReminderToCustomer } from '@/lib/email'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  const [reservation, tenant] = await Promise.all([
    prisma.reservation.findFirst({
      where: { id, tenantId: session.tenantId },
    }),
    prisma.tenant.findUnique({ where: { id: session.tenantId } }),
  ])

  if (!reservation) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!reservation.customerEmail) return NextResponse.json({ error: 'No email' }, { status: 400 })
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // Only remind on active reservations
  if (!['PENDING', 'CONFIRMED'].includes(reservation.status)) {
    return NextResponse.json({ error: 'Statut incompatible' }, { status: 400 })
  }

  try {
    await sendReminderToCustomer({
      to:           reservation.customerEmail,
      customerName: reservation.customerName,
      shopName:     tenant.name,
      shopPhone:    tenant.phone,
      bikeType:     reservation.bikeType ?? 'CITY',
      startAt:      reservation.startAt,
      endAt:        reservation.endAt,
      notes:        reservation.notes,
      locale:       'fr',
    })

    // Mark both reminder flags so the auto cron doesn't double-send
    const now = new Date()
    await prisma.reservation.update({
      where: { id: reservation.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        reminderSentAt:   (reservation as any).reminderSentAt   ?? now,
        reminder2hSentAt: (reservation as any).reminder2hSentAt ?? now,
      } as any,
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur email'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
