-- Add notification fields to Tenant
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "notifLocale" TEXT NOT NULL DEFAULT 'es';
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "notifWhatsapp" TEXT;

-- Add chase tracking fields to Rental
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "lastChaseAt" TIMESTAMP(3);
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "chaseCount" INTEGER NOT NULL DEFAULT 0;
