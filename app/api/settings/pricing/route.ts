import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { pricingGrid: true },
  })

  return NextResponse.json(tenant?.pricingGrid ?? {})
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.role !== 'OWNER') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await req.json()

  await prisma.tenant.update({
    where: { id: session.tenantId },
    data: { pricingGrid: body },
  })

  return NextResponse.json({ ok: true })
}
