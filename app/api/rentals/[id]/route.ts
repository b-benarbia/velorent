import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const { id } = await params

    const rental = await prisma.rental.findFirst({
      where: { id, tenantId: session.tenantId },
      include: {
        bike:  true,  // backward compat
        bikes: { include: { bike: true } },
        customer: true,
      },
    })

    if (!rental) return NextResponse.json({ error: 'Location introuvable' }, { status: 404 })

    return NextResponse.json(rental)
  } catch (e) {
    console.error('[rentals/[id] GET]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
