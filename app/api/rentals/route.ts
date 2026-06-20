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
    include: {
      bike:  true,  // backward compat (anciennes locations)
      bikes: { include: { bike: true } },
      customer: true,
    },
    orderBy: { startAt: 'desc' },
  })

  return NextResponse.json(rentals)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const {
    bikeIds,          // nouvelle API: string[]
    bikeId,           // backward compat: string (ignoré si bikeIds présent)
    customerId, expectedReturnAt, depositAmount, depositPaymentMethod,
    amountPaid, paymentMethod, notes, openingSignature, staffSignature, accessories,
  } = body

  // Normalise: on travaille toujours avec un tableau
  const ids: string[] = Array.isArray(bikeIds) && bikeIds.length > 0
    ? bikeIds
    : bikeId ? [bikeId] : []

  if (ids.length === 0 || !customerId) {
    return NextResponse.json({ error: 'Au moins un vélo et un client requis' }, { status: 400 })
  }

  // Vérifie que tous les vélos appartiennent au tenant et sont disponibles
  const bikes = await prisma.bike.findMany({
    where: { id: { in: ids }, tenantId: session.tenantId },
  })

  if (bikes.length !== ids.length) {
    return NextResponse.json({ error: 'Un ou plusieurs vélos introuvables' }, { status: 404 })
  }

  const unavailable = bikes.find(b => b.status !== 'AVAILABLE')
  if (unavailable) {
    return NextResponse.json(
      { error: `Le vélo "${unavailable.name}" (${unavailable.code}) n'est pas disponible` },
      { status: 409 }
    )
  }

  // Vérifie le client
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId: session.tenantId },
  })
  if (!customer) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  try {
    const rental = await prisma.$transaction(async (tx) => {
      const firstBike = bikes[0]

      const r = await tx.rental.create({
        data: {
          tenantId:    session.tenantId,
          bikeId:      null,  // on utilise la table pivot désormais
          customerId,
          createdById: session.userId,
          startAt:          new Date(),
          expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt) : null,
          depositAmount:    depositAmount  ? parseFloat(depositAmount)  : 0,
          notes:            notes || null,
          status:           'ACTIVE',
          source:           'WALKIN',
          paymentMethod:    paymentMethod || 'CASH',
          amountPaid:       amountPaid    ? parseFloat(amountPaid)    : null,
          openingSignature: openingSignature || null,
          staffSignature:   staffSignature   || null,
          contractSigned:   !!(openingSignature && staffSignature),
          accessories:      accessories ?? [],
          rateSnapshot: {
            dailyRate:            Number(firstBike.dailyRate),
            hourlyRate:           firstBike.hourlyRate ? Number(firstBike.hourlyRate) : null,
            depositPaymentMethod: depositPaymentMethod ?? 'CASH',
            bikeCount:            bikes.length,
          },
        },
      })

      // Crée les lignes pivot RentalBike
      await tx.rentalBike.createMany({
        data: ids.map(bId => ({ rentalId: r.id, bikeId: bId })),
      })

      // Met tous les vélos en statut RENTED
      await tx.bike.updateMany({
        where: { id: { in: ids } },
        data: { status: 'RENTED' },
      })

      return tx.rental.findUnique({
        where: { id: r.id },
        include: { bikes: { include: { bike: true } }, customer: true },
      })
    })

    if (!rental) throw new Error('Rental creation failed')

    // ── Envoi du contrat PDF au client (fire-and-forget) ────────────────────
    if (customer.email) {
      const contractNumber = `${new Date(rental.startAt).getFullYear()}-${rental.id.slice(0, 8).toUpperCase()}`
      const accessoriesList: { label: string; qty: number; codes?: string[] }[] =
        Array.isArray(rental.accessories) ? rental.accessories as { label: string; qty: number; codes?: string[] }[] : []

      const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } })
      const fmtFull = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      const fmtShortFR = (d: Date) => d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const fmtTime = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

      const bikeList = (rental.bikes.length > 0
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? rental.bikes.map((rb: any) => rb.bike)
        : bikes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ).map((b: any) => ({
        name: b?.name ?? '', code: b?.code ?? '',
        serialNumber: b?.serialNumber ?? null, type: b?.type ?? null,
      }))

      const pdfData: ContractData = {
        contractNumber,
        generatedAt: new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        tenant: { name: tenant?.name ?? '', address: tenant?.address, phone: tenant?.phone, email: tenant?.email },
        customer: {
          firstName: customer.firstName, lastName: customer.lastName,
          nationality: customer.nationality, phone: customer.phone, email: customer.email,
          documentType: customer.documentType, documentNumber: customer.documentNumber,
          documentPhotoUrl: customer.documentPhotoUrl,
        },
        bikes: bikeList,
        rental: {
          startAt:            fmtShortFR(rental.startAt),
          startAtFull:        fmtFull(rental.startAt),
          startTime:          fmtTime(rental.startAt),
          expectedReturn:     rental.expectedReturnAt ? fmtShortFR(rental.expectedReturnAt) : null,
          expectedReturnFull: rental.expectedReturnAt ? fmtFull(rental.expectedReturnAt) : null,
          endAt:              null,
          endAtFull:          null,
          endTime:            null,
          paymentMethod: rental.paymentMethod,
          amountPaid:    Number(rental.amountPaid ?? 0).toFixed(2),
          depositAmount: Number(rental.depositAmount ?? 0).toFixed(2),
          depositMethod: (rental.rateSnapshot as { depositPaymentMethod?: string })?.depositPaymentMethod ?? 'CASH',
          lockNumber:    rental.lockNumber,
          accessories:   accessoriesList,
          openingSignature: rental.openingSignature,
          staffSignature:   rental.staffSignature,
          closingSignature: null,
        },
      }

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
          )
      ).catch(err => console.error('Contract email error:', err))
    }

    return NextResponse.json(rental, { status: 201 })
  } catch (err: unknown) {
    console.error('Rental create error:', err)
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
