import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // notifLocale + notifWhatsapp sont dans le client Prisma
  // googlePlaceId est une colonne SQL ajoutée via migration → $queryRaw
  const [tenant, rows] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { notifLocale: true, notifWhatsapp: true },
    }),
    prisma.$queryRaw<Array<{ googlePlaceId: string | null }>>`
      SELECT "googlePlaceId" FROM tenants WHERE id = ${session.tenantId}
    `.catch(() => [{ googlePlaceId: null }]),
  ])

  return NextResponse.json({
    ...(tenant ?? {}),
    googlePlaceId: rows[0]?.googlePlaceId ?? '',
  })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.role !== 'OWNER') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { notifLocale, notifWhatsapp, googlePlaceId } = await req.json()

  // Champs gérés par Prisma
  await prisma.tenant.update({
    where: { id: session.tenantId },
    data: {
      ...(notifLocale   !== undefined && { notifLocale }),
      ...(notifWhatsapp !== undefined && { notifWhatsapp: notifWhatsapp?.trim() || null }),
    },
  })

  // googlePlaceId — colonne SQL seulement ($executeRaw)
  if (googlePlaceId !== undefined) {
    await prisma.$executeRaw`
      UPDATE tenants SET "googlePlaceId" = ${googlePlaceId?.trim() || null} WHERE id = ${session.tenantId}
    `
  }

  return NextResponse.json({ ok: true })
}
