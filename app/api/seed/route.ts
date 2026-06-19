import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Route de seed TEMPORAIRE — à supprimer après usage
export async function GET() {
  // Sécurité minimale
  const existing = await prisma.user.findFirst({ where: { email: 'benarbia0204@gmail.com' } })
  if (existing) {
    return NextResponse.json({ ok: false, message: 'User already exists', email: existing.email })
  }

  let tenant = await prisma.tenant.findFirst({ where: { slug: 'bikealao' } })
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { slug: 'bikealao', name: 'BikeAlao Marítim', email: 'benarbia0204@gmail.com' }
    })
  }

  const hash = await bcrypt.hash('Admin123!', 10)
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'benarbia0204@gmail.com',
      name: 'Bilal',
      passwordHash: hash,
      role: 'OWNER',
    }
  })

  return NextResponse.json({
    ok: true,
    message: 'Compte créé !',
    email: 'benarbia0204@gmail.com',
    password: 'Admin123!',
    loginUrl: '/login',
  })
}
