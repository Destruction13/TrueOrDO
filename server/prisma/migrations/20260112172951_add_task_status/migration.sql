-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Round" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "currentPlayerId" TEXT,
    "turnPlayerId" TEXT,
    "mode" TEXT,
    "timerSeconds" INTEGER NOT NULL,
    "phase" TEXT NOT NULL DEFAULT 'idle',
    "taskStatus" TEXT NOT NULL DEFAULT 'pending',
    "taskAcceptedAt" DATETIME,
    "result" TEXT,
    CONSTRAINT "Round_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Round_currentPlayerId_fkey" FOREIGN KEY ("currentPlayerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Round" ("currentPlayerId", "endedAt", "id", "mode", "phase", "result", "roomId", "startedAt", "timerSeconds", "turnPlayerId") SELECT "currentPlayerId", "endedAt", "id", "mode", "phase", "result", "roomId", "startedAt", "timerSeconds", "turnPlayerId" FROM "Round";
DROP TABLE "Round";
ALTER TABLE "new_Round" RENAME TO "Round";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
