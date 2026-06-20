import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import type { ContractData } from '@/lib/pdf/contract'
import { sendContractToCustomer } from '@/lib/email'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const rentals = await prisma.rental.findMany({
    where: { tenantId: session.tenantId },
    include: { bike: true, customer: true },
    orderBy: { startAt: 'desc' },
  })

  return NextResponse.json(rentals)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { bikeId, customerId, expectedReturnAt, depositAmount, depositPaymentMethod, amountPaid, paymentMethod, notes, openingSignature, staffSignature, accessories } = body

  if (!bikeId || !customerId) {
    return NextResponse.json({ error: 'Vélo et client requis' }, { status: 400 })
  }

  // Check bike belongs to tenant and is available
  const bike = await prisma.bike.findFirst({
    where: { id: bikeId, tenantId: session.tenantId },
  })
  if (!bike) return NextResponse.json({ error: 'Vélo introuvable' }, { status: 404 })
  if (bike.status !== 'AVAILABLE') {
    return NextResponse.json({ error: 'Ce vélo n\'est pas disponible' }, { status: 409 })
  }

  // Check customer belongs to tenant
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId: session.tenantId },
  })
  if (!customer) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  try {
  // Create rental + update bike in transaction
  const rental = await prisma.$transaction(async (tx) => {
    const r = await tx.rental.create({
      data: {
        tenantId: session.tenantId,
        bikeId,
        customerId,
        createdById: session.userId,
        startAt: new Date(),
        expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt) : null,
        depositAmount: depositAmount ? parseFloat(depositAmount) : 0,
        notes: notes || null,
        status: 'ACTIVE',
        source: 'WALKIN',
        paymentMethod: paymentMethod || 'CASH',
        amountPaid: amountPaid ? parseFloat(amountPaid) : null,
        openingSignature: openingSignature || null,
        staffSignature:   staffSignature   || null,
        contractSigned: !!(openingSignature && staffSignature),
        accessories: accessories ?? [],
        rateSnapshot: {
          dailyRate: Number(bike.dailyRate),
          hourlyRate: bike.hourlyRate ? Number(bike.hourlyRate) : null,
          depositPaymentMethod: depositPaymentMethod ?? 'CASH',
        },
      },
      include: { bike: true, customer: true },
    })

    await tx.bike.update({ where: { id: bikeId }, data: { status: 'RENTED' } })

    return r
  })

  // ── Send signed contract PDF to customer (non-blocking) ─────────────────
  if (customer.email) {
    const contractNumber = `${new Date(rental.startAt).getFullYear()}-${rental.id.slice(0, 8).toUpperCase()}`
    const accessories: { label: string; qty: number; codes?: string[] }[] =
      Array.isArray(rental.accessories) ? rental.accessories as { label: string; qty: number; codes?: string[] }[] : []

    const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } })

    const fmtES = (d: Date) => d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const fmtTime = (d: Date) => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

    const pdfData: ContractData = {
      contractNumber,
      generatedAt: new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      tenant: { name: tenant?.name ?? '', address: tenant?.address, phone: tenant?.phone, email: tenant?.email },
      customer: {
        firstName: customer.firstName, lastName: customer.lastName,
        nationality: customer.nationality, phone: customer.phone, email: customer.email,
        documentType: customer.documentType, documentNumber: customer.documentNumber,
        documentPhotoUrl: customer.documentPhotoUrl,
      },
      bike: { name: bike.name, code: bike.code, serialNumber: bike.serialNumber, type: bike.type },
      rental: {
        startAt:        fmtES(rental.startAt),
        startTime:      fmtTime(rental.startAt),
        expectedReturn: rental.expectedReturnAt
          ? new Date(rental.expectedReturnAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
          : null,
        paymentMethod: rental.paymentMethod,
        amountPaid:    Number(rental.amountPaid ?? 0).toFixed(2),
        depositAmount: Number(rental.depositAmount ?? 0).toFixed(2),
        depositMethod: (rental.rateSnapshot as { depositPaymentMethod?: string })?.depositPaymentMethod ?? 'CASH',
        lockNumber:    rental.lockNumber,
        accessories,
        openingSignature: rental.openingSignature,
        staffSignature:   rental.staffSignature,
      },
    }

    // Fire-and-forget — don't block the response
    // Dynamic imports: avoid Turbopack static analysis of @react-pdf/renderer at startup
    Promise.all([
      import('@react-pdf/renderer').then(m => m.renderToBuffer),
      import('@/lib/pdf/contract').then(m => m.ContractPDF),
    ]).then(([renderToBuffer, ContractPDF]) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderToBuffer(React.createElement(ContractPDF, { data: pdfData }) as any)
      .then(pdfBuffer =>
        sendContractToCustomer({
          to:             customer.email!,
          customerName:   `${customer.firstName} ${customer.lastName}`,
          shopName:       tenant?.name ?? '',
          contractNumber,
          pdfBuffer,
        })
      ))
      .catch(err => console.error('Contract email error:', err))
  }

  return NextResponse.json(rental, { status: 201 })
  } catch (err: unknown) {
    console.error('Rental create error:', err)
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
