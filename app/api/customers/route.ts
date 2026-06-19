import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const customers = await prisma.customer.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { lastName: 'asc' },
  })

  return NextResponse.json(customers)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const body = await req.json()
    const { firstName, lastName, email, phone, documentType, documentNumber, nationality, notes, documentPhoto } = body

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'Prénom et nom requis' }, { status: 400 })
    }

    const customer = await prisma.customer.create({
      data: {
        tenantId: session.tenantId,
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        documentType: documentType || 'PASSPORT',
        documentNumber: documentNumber || null,
        nationality: nationality || null,
        notes: notes || null,
        documentPhotoUrl: documentPhoto || null,
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (err: unknown) {
    console.error('Customer create error:', err)
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
