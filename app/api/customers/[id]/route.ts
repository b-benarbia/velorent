import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: session.tenantId },
    include: {
      rentals: {
        orderBy: { startAt: 'desc' },
        include: { bike: true },
      },
    },
  })

  if (!customer) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  return NextResponse.json(customer)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  // Only OWNER can delete customers
  if (session.role !== 'OWNER') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  try {
    await prisma.customer.delete({
      where: { id, tenantId: session.tenantId },
    })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
