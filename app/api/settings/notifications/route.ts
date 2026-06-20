import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { notifLocale: true, notifWhatsapp: true },
  })

  return NextResponse.json(tenant ?? {})
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.role !== 'OWNER') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { notifLocale, notifWhatsapp } = await req.json()

  await prisma.tenant.update({
    where: { id: session.tenantId },
    data: {
      ...(notifLocale   !== undefined && { notifLocale }),
      ...(notifWhatsapp !== undefined && { notifWhatsapp: notifWhatsapp?.trim() || null }),
    },
  })

  return NextResponse.json({ ok: true })
}
