import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const accessories = await prisma.accessory.findMany({
      where: { tenantId: session.tenantId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json(accessories)
  } catch (e) {
    console.error('[accessories GET]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const body = await req.json()
    const { type, name, code, notes } = body

    if (!type || !name) {
      return NextResponse.json({ error: 'Type et nom requis' }, { status: 400 })
    }

    const accessory = await prisma.accessory.create({
      data: {
        tenantId: session.tenantId,
        type,
        name,
        code: code || null,
        notes: notes || null,
        status: 'AVAILABLE',
      },
    })
    return NextResponse.json(accessory, { status: 201 })
  } catch (e) {
    console.error('[accessories POST]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
