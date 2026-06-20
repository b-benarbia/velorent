/**
 * Migration manuelle — champs Stripe
 * Lancer une fois : npx tsx --env-file=.env scripts/migrate-stripe.ts
 */
import { prisma } from '../lib/prisma'

async function main() {
  console.log('🔄 Migration Stripe en cours...')

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "stripePublishableKey" TEXT`
  )
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "stripeSecretKey" TEXT`
  )
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "depositAmount" DECIMAL(65,30) DEFAULT 0`
  )
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "depositIntentId" TEXT`
  )
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "depositCaptured" BOOLEAN NOT NULL DEFAULT false`
  )

  console.log('✅ Migration terminée')
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
