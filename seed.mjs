import { PrismaClient } from './app/generated/prisma/index.js'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const DATABASE_URL = "postgres://534c97eea24a1839d80d4fceacf99f07ec4665a0898d155065cc0cf0384c4b3b:sk_NeAGNqlglby_m88UVF05u@db.prisma.io:5432/postgres?sslmode=require"

const adapter = new PrismaPg({ connectionString: DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const existing = await prisma.tenant.findFirst({ where: { slug: 'bikealao' } })
  if (existing) {
    console.log('Tenant existe:', existing.slug)
    const users = await prisma.user.findMany({ where: { tenantId: existing.id }, select: { email: true, role: true } })
    console.log('Users:', JSON.stringify(users))
    return
  }

  const tenant = await prisma.tenant.create({
    data: { slug: 'bikealao', name: 'BikeAlao Marítim', email: 'benarbia0204@gmail.com' }
  })
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
  console.log('✅ Tenant:', tenant.slug)
  console.log('✅ User: benarbia0204@gmail.com / Admin123!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
