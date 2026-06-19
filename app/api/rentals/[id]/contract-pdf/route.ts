import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ContractPDF, type ContractData } from '@/lib/pdf/contract'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function fmt(d: Date | string, locale = 'es-ES') {
  return new Date(d).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtTime(d: Date | string, locale = 'es-ES') {
  return new Date(d).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}
function fmtShort(d: Date | string, locale = 'es-ES') {
  return new Date(d).toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
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
    include: { bike: true, customer: true, tenant: true },
  }) as any

  if (!rental) return new NextResponse('Not found', { status: 404 })

  const contractNumber = `${new Date(rental.startAt).getFullYear()}-${rental.id.slice(0, 8).toUpperCase()}`
  const generatedAt    = new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const accessories: { label: string; qty: number; codes?: string[] }[] =
    Array.isArray(rental.accessories)
      ? (rental.accessories as { label: string; qty: number; codes?: string[] }[])
      : []

  const data: ContractData = {
    contractNumber,
    generatedAt,
    tenant: {
      name:    rental.tenant.name,
      address: rental.tenant.address,
      phone:   rental.tenant.phone,
      email:   rental.tenant.email,
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
    bike: {
      name:         rental.bike.name,
      code:         rental.bike.code,
      serialNumber: rental.bike.serialNumber,
      type:         rental.bike.type,
    },
    rental: {
      startAt:         fmt(rental.startAt),
      startTime:       fmtTime(rental.startAt),
      expectedReturn:  rental.expectedReturnAt
        ? new Date(rental.expectedReturnAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
        : null,
      endAt:   rental.endAt ? fmtShort(rental.endAt) : null,
      endTime: rental.endAt ? fmtTime(rental.endAt) : null,
      paymentMethod:  rental.paymentMethod,
      amountPaid:     Number(rental.amountPaid ?? 0).toFixed(2),
      depositAmount:  Number(rental.depositAmount ?? 0).toFixed(2),
      depositMethod:  (rental.rateSnapshot as { depositPaymentMethod?: string })?.depositPaymentMethod ?? 'CASH',
      lockNumber:     rental.lockNumber,
      accessories,
      openingSignature: rental.openingSignature,
      staffSignature:   rental.staffSignature,
    },
  }

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
