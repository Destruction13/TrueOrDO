-- CreateTable
CREATE TABLE "Frame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "game" TEXT NOT NULL DEFAULT 'all',
    "accessType" TEXT NOT NULL DEFAULT 'free',
    "price" REAL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserCustomization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "frameAll" TEXT,
    "frameCodenames" TEXT,
    "frameAlias" TEXT,
    "frameTod" TEXT,
    "frameEmotional" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserCustomization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Frame_slug_key" ON "Frame"("slug");

-- CreateIndex
CREATE INDEX "Frame_game_isActive_idx" ON "Frame"("game", "isActive");

-- CreateIndex
CREATE INDEX "Frame_accessType_idx" ON "Frame"("accessType");

-- CreateIndex
CREATE UNIQUE INDEX "UserCustomization_userId_key" ON "UserCustomization"("userId");
