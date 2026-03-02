-- CreateTable
CREATE TABLE "NicknameGradient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cssValue" TEXT NOT NULL,
    "accessType" TEXT NOT NULL DEFAULT 'free',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NicknameGlow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cssValue" TEXT NOT NULL,
    "accessType" TEXT NOT NULL DEFAULT 'free',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AlterTable UserCustomization
ALTER TABLE "UserCustomization" ADD COLUMN "nicknameColorType" TEXT NOT NULL DEFAULT 'basic';
ALTER TABLE "UserCustomization" ADD COLUMN "nicknameCustomColor" TEXT;
ALTER TABLE "UserCustomization" ADD COLUMN "nicknameGradientId" TEXT;
ALTER TABLE "UserCustomization" ADD COLUMN "nicknameGlowId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "NicknameGradient_slug_key" ON "NicknameGradient"("slug");
CREATE INDEX "NicknameGradient_accessType_isActive_idx" ON "NicknameGradient"("accessType", "isActive");

CREATE UNIQUE INDEX "NicknameGlow_slug_key" ON "NicknameGlow"("slug");
CREATE INDEX "NicknameGlow_accessType_isActive_idx" ON "NicknameGlow"("accessType", "isActive");
