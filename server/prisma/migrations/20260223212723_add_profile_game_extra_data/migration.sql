-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserProfileGame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coverUrl" TEXT,
    "extraData" TEXT NOT NULL DEFAULT '{}',
    "listType" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "experienceTag" TEXT,
    "ratingTag" TEXT,
    "searchTags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserProfileGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserProfileGame" ("coverUrl", "createdAt", "experienceTag", "gameId", "id", "listType", "name", "ratingTag", "searchTags", "sortOrder", "updatedAt", "userId") SELECT "coverUrl", "createdAt", "experienceTag", "gameId", "id", "listType", "name", "ratingTag", "searchTags", "sortOrder", "updatedAt", "userId" FROM "UserProfileGame";
DROP TABLE "UserProfileGame";
ALTER TABLE "new_UserProfileGame" RENAME TO "UserProfileGame";
CREATE INDEX "UserProfileGame_userId_listType_idx" ON "UserProfileGame"("userId", "listType");
CREATE INDEX "UserProfileGame_userId_idx" ON "UserProfileGame"("userId");
CREATE UNIQUE INDEX "UserProfileGame_userId_gameId_listType_key" ON "UserProfileGame"("userId", "gameId", "listType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
