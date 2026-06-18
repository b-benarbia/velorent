import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json()
    const { closingSignature, staffSignature } = body

    const rental = await prisma.rental.findFirst({
      where: { id, tenantId: session.tenantId },
    })

    if (!rental) return NextResponse.json({ error: 'Location introuvable' }, { status: 404 })
    if (rental.status !== 'ACTIVE') return NextResponse.json({ error: 'Location déjà clôturée' }, { status: 409 })

    const returnAt = new Date()

    const result = await prisma.$transaction(async (tx) => {
      const closed = await tx.rental.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          endAt: returnAt,
          closingSignature: closingSignature || null,
          staffSignature: staffSignature || null,
          contractSigned: true,
          depositReturned: true,
        },
        include: { bike: true, customer: true },
      })

      await tx.bike.update({
        where: { id: rental.bikeId },
        data: { status: 'AVAILABLE' },
      })


      // Create invoice
      const amount = Number(rental.amountPaid ?? 0)
      const taxRate = 0.21
      const amountHt = amount / (1 + taxRate)
      await tx.invoice.create({
        data: {
          tenantId: session.tenantId,
          rentalId: id,
          number: `INV-${Date.now()}`,
          issuedAt: new Date(rental.startAt),
          amountHt,
          taxRate,
          amountTtc: amount,
        },
      })

      return closed
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    console.error('Close rental error:', err)
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
