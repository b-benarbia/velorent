import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  // Diagnostic
  const jwtSet = !!process.env.JWT_SECRET
  const jwtLen = process.env.JWT_SECRET?.length ?? 0
  const dbSet = !!process.env.DATABASE_URL

  // Reset password
  try {
    const hash = await bcrypt.hash('Admin123!', 10)
    const user = await prisma.user.update({
      where: { email: 'benarbia0204@gmail.com' },
      data: { passwordHash: hash },
      include: { tenant: true },
    })
    return NextResponse.json({
      ok: true,
      email: user.email,
      password: 'Admin123!',
      tenantSlug: user.tenant.slug,
      jwtSet,
      jwtLen,
      dbSet,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, jwtSet, jwtLen, dbSet })
  }
}
