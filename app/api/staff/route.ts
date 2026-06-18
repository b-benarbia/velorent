import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.role !== 'OWNER') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const staff = await prisma.user.findMany({
    where: { tenantId: session.tenantId, role: 'STAFF' },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(staff)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.role !== 'OWNER') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  try {
    const { firstName, lastName, email, password } = await req.json()

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        tenantId: session.tenantId,
        name: `${firstName} ${lastName}`,
        email,
        passwordHash,
        role: 'STAFF',
      },
      select: { id: true, name: true, email: true, createdAt: true },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.role !== 'OWNER') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await req.json()
  await prisma.user.delete({ where: { id, tenantId: session.tenantId } })
  return NextResponse.json({ ok: true })
}
