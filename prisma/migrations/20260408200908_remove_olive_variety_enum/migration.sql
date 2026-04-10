/*
  Warnings:

  - Changed the type of `variety` on the `GroveVariety` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "GroveVariety" DROP COLUMN "variety",
ADD COLUMN     "variety" TEXT NOT NULL;

-- DropEnum
DROP TYPE "OliveVariety";

-- CreateIndex
CREATE UNIQUE INDEX "GroveVariety_groveId_variety_key" ON "GroveVariety"("groveId", "variety");
