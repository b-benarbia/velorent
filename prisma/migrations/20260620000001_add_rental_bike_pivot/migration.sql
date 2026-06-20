-- AlterTable: make bikeId nullable on rentals
ALTER TABLE "rentals" ALTER COLUMN "bikeId" DROP NOT NULL;

-- CreateTable: rental_bikes (pivot multi-vélo)
CREATE TABLE "rental_bikes" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "bikeId" TEXT NOT NULL,

    CONSTRAINT "rental_bikes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rental_bikes_rentalId_bikeId_key" ON "rental_bikes"("rentalId", "bikeId");

-- AddForeignKey
ALTER TABLE "rental_bikes" ADD CONSTRAINT "rental_bikes_rentalId_fkey"
  FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_bikes" ADD CONSTRAINT "rental_bikes_bikeId_fkey"
  FOREIGN KEY ("bikeId") REFERENCES "bikes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DataMigration: populate rental_bikes from existing bikeId values (backward compat)
INSERT INTO "rental_bikes" ("id", "rentalId", "bikeId")
SELECT gen_random_uuid()::text, "id", "bikeId"
FROM "rentals"
WHERE "bikeId" IS NOT NULL
ON CONFLICT DO NOTHING;
