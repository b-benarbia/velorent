import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { sendReceiptToCustomer } from '@/lib/email'

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

    const [rental, tenant] = await Promise.all([
      prisma.rental.findFirst({
        where: { id, tenantId: session.tenantId },
        include: { customer: true, bike: true },
      }),
      prisma.tenant.findUnique({ where: { id: session.tenantId } }),
    ])

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
        where: { id: closed.bikeId },
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

    // ── Reçu email au client (fire-and-forget) ─────────────────────────────
    const customerEmail = result.customer.email
    if (customerEmail) {
      const contractNumber = `${new Date(result.startAt).getFullYear()}-${result.id.slice(0, 8).toUpperCase()}`
      sendReceiptToCustomer({
        to:              customerEmail,
        customerName:    `${result.customer.firstName} ${result.customer.lastName}`,
        shopName:        tenant?.name ?? '',
        shopPhone:       tenant?.phone,
        bikeName:        result.bike.name,
        bikeCode:        result.bike.code,
        startAt:         result.startAt,
        endAt:           returnAt,
        amountPaid:      Number(result.amountPaid ?? 0),
        depositAmount:   Number(result.depositAmount ?? 0),
        depositReturned: true,
        contractNumber,
      }).catch(err => console.error('Receipt email error:', err))
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    console.error('Close rental error:', err)
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
