-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "connectionStatus" TEXT NOT NULL DEFAULT 'online',
    "strikes" INTEGER NOT NULL DEFAULT 0,
    "shameTitle" TEXT,
    "shameClearProgress" INTEGER NOT NULL DEFAULT 0,
    "chaosClearProgress" INTEGER NOT NULL DEFAULT 0,
    "truthStreak" INTEGER NOT NULL DEFAULT 0,
    "dareStreak" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Player_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("avatarUrl", "chaosClearProgress", "dareStreak", "id", "joinedAt", "lastSeen", "name", "roomId", "shameClearProgress", "shameTitle", "status", "strikes", "truthStreak") SELECT "avatarUrl", "chaosClearProgress", "dareStreak", "id", "joinedAt", "lastSeen", "name", "roomId", "shameClearProgress", "shameTitle", "status", "strikes", "truthStreak" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
