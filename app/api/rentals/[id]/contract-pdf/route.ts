import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import type { ContractData } from '@/lib/pdf/contract'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function fmtFull(d: Date | string, locale = 'fr-FR') {
  return new Date(d).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtShort(d: Date | string, locale = 'fr-FR') {
  return new Date(d).toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtTime(d: Date | string, locale = 'fr-FR') {
  return new Date(d).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return new NextResponse('Non autorisé', { status: 401 })

  const { id } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rental = await prisma.rental.findFirst({
    where: { id, tenantId: session.tenantId },
    include: {
      bike:  true,  // backward compat
      bikes: { include: { bike: true } },
      customer: true,
      tenant: true,
    },
  }) as any

  if (!rental) return new NextResponse('Not found', { status: 404 })

  const contractNumber = `${new Date(rental.startAt).getFullYear()}-${rental.id.slice(0, 8).toUpperCase()}`
  const generatedAt    = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const accessories: { label: string; qty: number; codes?: string[] }[] =
    Array.isArray(rental.accessories)
      ? (rental.accessories as { label: string; qty: number; codes?: string[] }[])
      : []

  // Normalise bikes: pivot (new) or legacy singular bike
  const bikeList = (
    Array.isArray(rental.bikes) && rental.bikes.length > 0
      ? rental.bikes.map((rb: any) => rb.bike)
      : rental.bike ? [rental.bike] : []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ).map((b: any) => ({
    name:         b.name         ?? '',
    code:         b.code         ?? '',
    serialNumber: b.serialNumber ?? null,
    type:         b.type         ?? null,
  }))

  const data: ContractData = {
    contractNumber,
    generatedAt,
    isCompleted: rental.status === 'COMPLETED',
    tenant: {
      name:    rental.tenant.name,
      address: rental.tenant.address,
      phone:   rental.tenant.phone,
      email:   rental.tenant.email,
      logoUrl: rental.tenant.logoUrl ?? null,
    },
    customer: {
      firstName:        rental.customer.firstName,
      lastName:         rental.customer.lastName,
      nationality:      rental.customer.nationality,
      phone:            rental.customer.phone,
      email:            rental.customer.email,
      documentType:     rental.customer.documentType,
      documentNumber:   rental.customer.documentNumber,
      documentPhotoUrl: rental.customer.documentPhotoUrl,
    },
    bikes: bikeList,
    rental: {
      startAt:             fmtShort(rental.startAt),
      startAtFull:         fmtFull(rental.startAt),
      startTime:           fmtTime(rental.startAt),
      expectedReturn:      rental.expectedReturnAt ? fmtShort(rental.expectedReturnAt) : null,
      expectedReturnFull:  rental.expectedReturnAt ? fmtFull(rental.expectedReturnAt) : null,
      endAt:               rental.endAt ? fmtShort(rental.endAt) : null,
      endAtFull:           rental.endAt ? fmtFull(rental.endAt) : null,
      endTime:             rental.endAt ? fmtTime(rental.endAt) : null,
      paymentMethod:       rental.paymentMethod,
      amountPaid:          Number(rental.amountPaid ?? 0).toFixed(2),
      depositAmount:       Number(rental.depositAmount ?? 0).toFixed(2),
      depositMethod:       (rental.rateSnapshot as { depositPaymentMethod?: string })?.depositPaymentMethod ?? 'CASH',
      lockNumber:          rental.lockNumber,
      accessories,
      openingSignature:    rental.openingSignature,
      staffSignature:      rental.staffSignature,
      closingSignature:    rental.closingSignature ?? null,
    },
  }

  // Dynamic imports: avoid Turbopack static analysis of @react-pdf/renderer at startup
  const [{ renderToBuffer }, { ContractPDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/lib/pdf/contract'),
  ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(React.createElement(ContractPDF, { data }) as any)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `inline; filename="contrat-${contractNumber}.pdf"`,
      'Cache-Control':       'no-store',
    },
  })
}
