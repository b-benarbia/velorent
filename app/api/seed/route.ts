import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const hash = await bcrypt.hash('Admin123!', 10)
  
  const user = await prisma.user.update({
    where: { email: 'benarbia0204@gmail.com' },
    data: { passwordHash: hash },
    include: { tenant: true }
  })

  return NextResponse.json({
    ok: true,
    message: 'Mot de passe réinitialisé',
    email: user.email,
    password: 'Admin123!',
    tenant: user.tenant.slug,
  })
}
