import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: {
      name: true,
      address: true,
      phone: true,
      email: true,
      website: true,
      taxRate: true,
      currency: true,
      depositConfig: true,
    },
  })

  return NextResponse.json(tenant ?? {})
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.role !== 'OWNER') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await req.json()
  const { name, address, phone, email, website, taxRate, depositConfig } = body

  await prisma.tenant.update({
    where: { id: session.tenantId },
    data: {
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(website !== undefined && { website }),
      ...(taxRate !== undefined && { taxRate: parseFloat(taxRate) }),
      ...(depositConfig !== undefined && { depositConfig }),
    },
  })

  return NextResponse.json({ ok: true })
}
