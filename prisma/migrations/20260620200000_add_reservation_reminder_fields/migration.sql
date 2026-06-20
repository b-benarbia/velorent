-- Add reminder tracking fields to Reservation
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "reminder2hSentAt" TIMESTAMP(3);
