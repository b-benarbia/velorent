-- CreateEnum
CREATE TYPE "AccessoryType" AS ENUM ('LOCK', 'HELMET', 'CHARGER', 'BASKET', 'CHILD_SEAT', 'OTHER');

-- CreateTable
CREATE TABLE "accessories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "AccessoryType" NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accessories_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "accessories" ADD CONSTRAINT "accessories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
