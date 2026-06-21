import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import type { InvoiceData } from '@/lib/pdf/invoice'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return new NextResponse('Non autorisé', { status: 401 })

  const { id } = await params

  const invoice = await prisma.invoice.findFirst({
    where: { id, tenantId: session.tenantId },
    include: {
      tenant: true,
      rental: {
        include: {
          customer: true,
          bike:  true,
          bikes: { include: { bike: true } },
        },
      },
    },
  })

  if (!invoice) return new NextResponse('Facture introuvable', { status: 404 })

  const bikes = (
    invoice.rental.bikes?.length
      ? invoice.rental.bikes.map(rb => rb.bike)
      : invoice.rental.bike ? [invoice.rental.bike] : []
  ).map(b => ({ name: b?.name ?? '—', code: b?.code ?? '' }))

  const data: InvoiceData = {
    number:    invoice.number,
    issuedAt:  invoice.issuedAt.toISOString(),
    currency:  invoice.currency,
    tenant: {
      name:    invoice.tenant.name,
      address: invoice.tenant.address,
      phone:   invoice.tenant.phone,
      email:   invoice.tenant.email,
    },
    customer: {
      firstName: invoice.rental.customer.firstName,
      lastName:  invoice.rental.customer.lastName,
      email:     invoice.rental.customer.email,
      phone:     invoice.rental.customer.phone,
    },
    bikes,
    rental: {
      startAt:          invoice.rental.startAt.toISOString(),
      endAt:            invoice.rental.endAt?.toISOString() ?? null,
      expectedReturnAt: invoice.rental.expectedReturnAt?.toISOString() ?? null,
      paymentMethod:    invoice.rental.paymentMethod,
    },
    amountHt:  Number(invoice.amountHt),
    taxRate:   Number(invoice.taxRate),
    amountTtc: Number(invoice.amountTtc),
  }

  const [{ renderToBuffer }, { InvoicePDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/lib/pdf/invoice'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(InvoicePDF, { data }) as any)

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `inline; filename="facture-${invoice.number}.pdf"`,
      'Cache-Control':       'no-store',
    },
  })
}
