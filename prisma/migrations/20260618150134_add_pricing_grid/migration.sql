-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "pricingGrid" JSONB NOT NULL DEFAULT '{}';
