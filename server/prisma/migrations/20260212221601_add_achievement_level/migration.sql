-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserAchievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leveledUpAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "featuredOrder" INTEGER,
    CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserAchievement" ("achievementId", "featuredOrder", "id", "isFeatured", "unlockedAt", "userId") SELECT "achievementId", "featuredOrder", "id", "isFeatured", "unlockedAt", "userId" FROM "UserAchievement";
DROP TABLE "UserAchievement";
ALTER TABLE "new_UserAchievement" RENAME TO "UserAchievement";
CREATE INDEX "UserAchievement_userId_isFeatured_idx" ON "UserAchievement"("userId", "isFeatured");
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
