/*
  Warnings:

  - You are about to alter the column `isActive` on the `NicknameGlow` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to alter the column `isActive` on the `NicknameGradient` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.

*/
-- AlterTable
ALTER TABLE "Player" ADD COLUMN "frameSlug" TEXT;

-- CreateTable
CREATE TABLE "NicknameEffect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "previewUrl" TEXT,
    "accessType" TEXT NOT NULL DEFAULT 'pro',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserGameStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "gameType" TEXT NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "gamesWon" INTEGER NOT NULL DEFAULT 0,
    "timePlayed" INTEGER NOT NULL DEFAULT 0,
    "customStats" TEXT NOT NULL DEFAULT '{}',
    "lastPlayedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserGameStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "gameType" TEXT,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "xpReward" INTEGER NOT NULL DEFAULT 10,
    "unlockCondition" TEXT NOT NULL DEFAULT '{}',
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "featuredOrder" INTEGER,
    CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPurchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "paymentId" TEXT,
    "purchasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NicknameGlow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cssValue" TEXT NOT NULL,
    "accessType" TEXT NOT NULL DEFAULT 'free',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_NicknameGlow" ("accessType", "createdAt", "cssValue", "id", "isActive", "name", "slug", "sortOrder") SELECT "accessType", "createdAt", "cssValue", "id", "isActive", "name", "slug", "sortOrder" FROM "NicknameGlow";
DROP TABLE "NicknameGlow";
ALTER TABLE "new_NicknameGlow" RENAME TO "NicknameGlow";
CREATE UNIQUE INDEX "NicknameGlow_slug_key" ON "NicknameGlow"("slug");
CREATE INDEX "NicknameGlow_accessType_isActive_idx" ON "NicknameGlow"("accessType", "isActive");
CREATE TABLE "new_NicknameGradient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cssValue" TEXT NOT NULL,
    "accessType" TEXT NOT NULL DEFAULT 'free',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_NicknameGradient" ("accessType", "createdAt", "cssValue", "id", "isActive", "name", "slug", "sortOrder") SELECT "accessType", "createdAt", "cssValue", "id", "isActive", "name", "slug", "sortOrder" FROM "NicknameGradient";
DROP TABLE "NicknameGradient";
ALTER TABLE "new_NicknameGradient" RENAME TO "NicknameGradient";
CREATE UNIQUE INDEX "NicknameGradient_slug_key" ON "NicknameGradient"("slug");
CREATE INDEX "NicknameGradient_accessType_isActive_idx" ON "NicknameGradient"("accessType", "isActive");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "emailVerifiedAt" DATETIME,
    "nickname" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "discordId" TEXT,
    "googleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "loginStreak" INTEGER NOT NULL DEFAULT 0,
    "lastLoginDate" DATETIME
);
INSERT INTO "new_User" ("avatarUrl", "bio", "createdAt", "discordId", "email", "emailVerifiedAt", "googleId", "id", "nickname", "passwordHash", "updatedAt") SELECT "avatarUrl", "bio", "createdAt", "discordId", "email", "emailVerifiedAt", "googleId", "id", "nickname", "passwordHash", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE TABLE "new_UserCustomization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "frameAll" TEXT,
    "frameCodenames" TEXT,
    "frameAlias" TEXT,
    "frameTod" TEXT,
    "frameEmotional" TEXT,
    "nicknameColorType" TEXT NOT NULL DEFAULT 'basic',
    "nicknameCustomColor" TEXT,
    "nicknameGradientId" TEXT,
    "nicknameGlowId" TEXT,
    "nicknameEffectId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserCustomization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserCustomization_nicknameGradientId_fkey" FOREIGN KEY ("nicknameGradientId") REFERENCES "NicknameGradient" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UserCustomization_nicknameGlowId_fkey" FOREIGN KEY ("nicknameGlowId") REFERENCES "NicknameGlow" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UserCustomization_nicknameEffectId_fkey" FOREIGN KEY ("nicknameEffectId") REFERENCES "NicknameEffect" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_UserCustomization" ("frameAlias", "frameAll", "frameCodenames", "frameEmotional", "frameTod", "id", "nicknameColorType", "nicknameCustomColor", "nicknameGlowId", "nicknameGradientId", "updatedAt", "userId") SELECT "frameAlias", "frameAll", "frameCodenames", "frameEmotional", "frameTod", "id", "nicknameColorType", "nicknameCustomColor", "nicknameGlowId", "nicknameGradientId", "updatedAt", "userId" FROM "UserCustomization";
DROP TABLE "UserCustomization";
ALTER TABLE "new_UserCustomization" RENAME TO "UserCustomization";
CREATE UNIQUE INDEX "UserCustomization_userId_key" ON "UserCustomization"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "NicknameEffect_slug_key" ON "NicknameEffect"("slug");

-- CreateIndex
CREATE INDEX "NicknameEffect_accessType_isActive_idx" ON "NicknameEffect"("accessType", "isActive");

-- CreateIndex
CREATE INDEX "UserGameStats_userId_idx" ON "UserGameStats"("userId");

-- CreateIndex
CREATE INDEX "UserGameStats_gameType_idx" ON "UserGameStats"("gameType");

-- CreateIndex
CREATE UNIQUE INDEX "UserGameStats_userId_gameType_key" ON "UserGameStats"("userId", "gameType");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_slug_key" ON "Achievement"("slug");

-- CreateIndex
CREATE INDEX "Achievement_category_idx" ON "Achievement"("category");

-- CreateIndex
CREATE INDEX "Achievement_gameType_idx" ON "Achievement"("gameType");

-- CreateIndex
CREATE INDEX "Achievement_rarity_idx" ON "Achievement"("rarity");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_isFeatured_idx" ON "UserAchievement"("userId", "isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "UserPurchase_userId_idx" ON "UserPurchase"("userId");

-- CreateIndex
CREATE INDEX "UserPurchase_itemType_itemId_idx" ON "UserPurchase"("itemType", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPurchase_userId_itemType_itemId_key" ON "UserPurchase"("userId", "itemType", "itemId");
