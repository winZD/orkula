-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Orchard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "area" REAL NOT NULL,
    "soilType" TEXT NOT NULL,
    "irrigation" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "numberOfTrees" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("id", "userId"),
    CONSTRAINT "Orchard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Variety" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "origin" TEXT,
    "orchardId" TEXT NOT NULL,
    "orchardUserId" TEXT NOT NULL,
    "treeNumber" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Variety_orchardId_orchardUserId_fkey" FOREIGN KEY ("orchardId", "orchardUserId") REFERENCES "Orchard" ("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Harvest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "quantity" REAL NOT NULL,
    "quality" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "orchardId" TEXT NOT NULL,
    "orchardUserId" TEXT NOT NULL,
    CONSTRAINT "Harvest_orchardId_orchardUserId_fkey" FOREIGN KEY ("orchardId", "orchardUserId") REFERENCES "Orchard" ("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "harvestId" TEXT,
    CONSTRAINT "Product_harvestId_fkey" FOREIGN KEY ("harvestId") REFERENCES "Harvest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RefreshTokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GRANTED',
    "familyId" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "RefreshTokens_familyId_idx" ON "RefreshTokens"("familyId");
