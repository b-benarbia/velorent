-- Add Stripe keys to Tenant
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "stripePublishableKey" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "stripeSecretKey" TEXT;

-- Add deposit pre-auth fields to Reservation
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "depositAmount" DECIMAL(65,30) DEFAULT 0;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "depositIntentId" TEXT;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "depositCaptured" BOOLEAN NOT NULL DEFAULT false;
