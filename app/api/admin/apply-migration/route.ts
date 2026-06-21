/**
 * POST /api/admin/apply-migration
 * Applique les migrations SQL en attente (colonnes ajoutées hors Prisma).
 * À supprimer après usage.
 */
import { NextResponse } from 'next/server'
import { prisma }       from '@/lib/prisma'

export async function POST() {
  const results: { sql: string; status: string; error?: string }[] = []

  const migrations = [
    // notification fields (20260620144751)
    `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "notifLocale" TEXT NOT NULL DEFAULT 'es'`,
    `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "notifWhatsapp" TEXT`,
    `ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "lastChaseAt" TIMESTAMP(3)`,
    `ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "chaseCount" INTEGER NOT NULL DEFAULT 0`,
    // stripe fields (20260620210000)
    `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "stripePublishableKey" TEXT`,
    `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "stripeSecretKey" TEXT`,
    `ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "depositAmount" DECIMAL(65,30) DEFAULT 0`,
    `ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "depositIntentId" TEXT`,
    `ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "depositCaptured" BOOLEAN NOT NULL DEFAULT false`,
    // dynamic pricing (20260621120000)
    `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "dynamicPricingConfig" JSONB DEFAULT '{"enabled":false,"minMultiplier":0.7,"maxMultiplier":1.5,"weekendBonus":0.15,"highUtilizationThreshold":0.8,"highUtilizationPremium":0.20,"lowUtilizationThreshold":0.4,"lowUtilizationDiscount":0.15,"seasonalRules":[{"months":[6,7,8],"factor":0.20},{"months":[12,1,2],"factor":-0.10}]}'::jsonb`,
    // reservation reminder (20260620200000)
    `ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3)`,
    // google review system (20260621180000)
    `ALTER TABLE "tenants"  ADD COLUMN IF NOT EXISTS "googlePlaceId" TEXT`,
    `ALTER TABLE "rentals"  ADD COLUMN IF NOT EXISTS "reviewToken"   TEXT`,
    `ALTER TABLE "rentals"  ADD COLUMN IF NOT EXISTS "reviewSentAt"  TIMESTAMP(3)`,
    `ALTER TABLE "rentals"  ADD COLUMN IF NOT EXISTS "reviewScore"   INTEGER`,
    `ALTER TABLE "rentals"  ADD COLUMN IF NOT EXISTS "reviewComment" TEXT`,
  ]

  for (const sql of migrations) {
    try {
      await prisma.$executeRawUnsafe(sql)
      results.push({ sql: sql.slice(0, 60) + '...', status: 'ok' })
    } catch (err: unknown) {
      results.push({ sql: sql.slice(0, 60) + '...', status: 'error', error: String(err) })
    }
  }

  return NextResponse.json({ applied: results.filter(r => r.status === 'ok').length, results })
}
