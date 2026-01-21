-- CreateTable
CREATE TABLE "AliasWord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AliasRoom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'lobby',
    "settings" TEXT NOT NULL DEFAULT '{}',
    "currentTeamId" TEXT,
    "currentExplainerId" TEXT,
    "turnStartedAt" DATETIME,
    "turnEndsAt" DATETIME,
    "currentWordId" TEXT,
    "deck" TEXT NOT NULL DEFAULT '[]',
    "usedWordIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AliasTeam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "turnOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AliasTeam_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "AliasRoom" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AliasPlayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "visitorId" TEXT,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "teamId" TEXT,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "isSpectator" BOOLEAN NOT NULL DEFAULT false,
    "connectionStatus" TEXT NOT NULL DEFAULT 'online',
    "explainOrder" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AliasPlayer_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "AliasRoom" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AliasPlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "AliasTeam" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AliasWord_difficulty_isActive_idx" ON "AliasWord"("difficulty", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AliasWord_text_difficulty_key" ON "AliasWord"("text", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "AliasRoom_code_key" ON "AliasRoom"("code");

-- CreateIndex
CREATE INDEX "AliasTeam_roomId_idx" ON "AliasTeam"("roomId");

-- CreateIndex
CREATE INDEX "AliasPlayer_roomId_idx" ON "AliasPlayer"("roomId");

-- CreateIndex
CREATE INDEX "AliasPlayer_teamId_idx" ON "AliasPlayer"("teamId");
