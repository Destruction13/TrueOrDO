-- CreateTable
CREATE TABLE "IgnoredUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "ignoredId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IgnoredUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IgnoredUser_ignoredId_fkey" FOREIGN KEY ("ignoredId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProfileReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reporterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    CONSTRAINT "ProfileReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProfileReport_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClanInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clanId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClanInvite_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClanInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClanInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "emailVerifiedAt" DATETIME,
    "nickname" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "visitorId" TEXT,
    "discordId" TEXT,
    "googleId" TEXT,
    "onlineStatus" TEXT NOT NULL DEFAULT 'offline',
    "lastSeenAt" DATETIME,
    "currentGameType" TEXT,
    "currentRoomCode" TEXT,
    "profileWarnings" INTEGER NOT NULL DEFAULT 0,
    "profileBlockedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "loginStreak" INTEGER NOT NULL DEFAULT 0,
    "lastLoginDate" DATETIME
);
INSERT INTO "new_User" ("avatarUrl", "bio", "createdAt", "currentGameType", "currentRoomCode", "discordId", "email", "emailVerifiedAt", "googleId", "id", "lastLoginDate", "lastSeenAt", "level", "loginStreak", "nickname", "onlineStatus", "passwordHash", "updatedAt", "visitorId", "xp") SELECT "avatarUrl", "bio", "createdAt", "currentGameType", "currentRoomCode", "discordId", "email", "emailVerifiedAt", "googleId", "id", "lastLoginDate", "lastSeenAt", "level", "loginStreak", "nickname", "onlineStatus", "passwordHash", "updatedAt", "visitorId", "xp" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "IgnoredUser_userId_idx" ON "IgnoredUser"("userId");

-- CreateIndex
CREATE INDEX "IgnoredUser_ignoredId_idx" ON "IgnoredUser"("ignoredId");

-- CreateIndex
CREATE UNIQUE INDEX "IgnoredUser_userId_ignoredId_key" ON "IgnoredUser"("userId", "ignoredId");

-- CreateIndex
CREATE INDEX "ProfileReport_targetId_status_idx" ON "ProfileReport"("targetId", "status");

-- CreateIndex
CREATE INDEX "ProfileReport_reporterId_idx" ON "ProfileReport"("reporterId");

-- CreateIndex
CREATE INDEX "ProfileReport_status_idx" ON "ProfileReport"("status");

-- CreateIndex
CREATE INDEX "ClanInvite_inviteeId_status_idx" ON "ClanInvite"("inviteeId", "status");

-- CreateIndex
CREATE INDEX "ClanInvite_clanId_idx" ON "ClanInvite"("clanId");

-- CreateIndex
CREATE INDEX "ClanInvite_expiresAt_idx" ON "ClanInvite"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClanInvite_clanId_inviteeId_key" ON "ClanInvite"("clanId", "inviteeId");
