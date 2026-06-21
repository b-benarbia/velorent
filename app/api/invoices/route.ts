import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const invoices = await prisma.invoice.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { issuedAt: 'desc' },
      include: {
        rental: {
          include: {
            customer: { select: { firstName: true, lastName: true } },
            bike:  { select: { name: true, code: true } },  // backward compat
            bikes: { include: { bike: { select: { name: true, code: true } } } },
          },
        },
      },
    })
    return NextResponse.json(invoices)
  } catch (e) {
    console.error('[invoices GET]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
