import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { shopName, email, password } = await req.json()

    if (!shopName || !email || !password) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    // Vérifier si l'email existe déjà
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 400 })
    }

    // Créer le slug à partir du nom du shop
    const slug = shopName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Math.random().toString(36).slice(2, 6)

    const passwordHash = await bcrypt.hash(password, 12)

    // Créer le tenant et l'owner en une transaction
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug,
          name: shopName,
        },
      })

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          name: shopName,
          passwordHash,
          role: 'OWNER',
        },
      })

      return { tenant, user }
    })

    const token = await signToken({
      userId: result.user.id,
      tenantId: result.tenant.id,
      tenantSlug: result.tenant.slug,
      role: 'OWNER',
    })

    const response = NextResponse.json({
      success: true,
      slug: result.tenant.slug,
    })

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
