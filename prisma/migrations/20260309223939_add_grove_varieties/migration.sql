/*
  Warnings:

  - You are about to drop the column `variety` on the `Grove` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Grove" DROP COLUMN "variety";

-- CreateTable
CREATE TABLE "GroveVariety" (
    "id" TEXT NOT NULL,
    "variety" "OliveVariety" NOT NULL,
    "treeCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groveId" TEXT NOT NULL,

    CONSTRAINT "GroveVariety_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroveVariety_groveId_variety_key" ON "GroveVariety"("groveId", "variety");

-- AddForeignKey
ALTER TABLE "GroveVariety" ADD CONSTRAINT "GroveVariety_groveId_fkey" FOREIGN KEY ("groveId") REFERENCES "Grove"("id") ON DELETE CASCADE ON UPDATE CASCADE;
