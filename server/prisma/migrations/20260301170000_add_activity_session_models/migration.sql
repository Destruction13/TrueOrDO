-- Модели для расширенной системы активности (Discord-стиль)

-- Сессии пользователя (история входов/выходов)
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "gameType" TEXT,
    "roomCode" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "duration" INTEGER,
    "deviceInfo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Индексы для быстрого поиска
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX "UserSession_userId_startedAt_idx" ON "UserSession"("userId", "startedAt");
CREATE INDEX "UserSession_gameType_idx" ON "UserSession"("gameType");

-- Добавляем поля для текущей сессии в User (для real-time отображения)
-- currentSessionId - ID активной сессии
-- activityStreakDays - количество дней подряд с активностью
-- lastActivityDate - дата последней активности (для расчёта стрика)
-- totalPlayTime - общее время в играх (в секундах)

-- Проверяем и добавляем поля, если их нет
-- SQLite не поддерживает IF NOT EXISTS для ALTER TABLE, поэтому используем простой ALTER

-- Поле для текущей игровой сессии
ALTER TABLE "User" ADD COLUMN "currentSessionId" TEXT;

-- Общее время в играх (секунды)
ALTER TABLE "User" ADD COLUMN "totalPlayTime" INTEGER NOT NULL DEFAULT 0;

-- Стрик активности (дни подряд)
ALTER TABLE "User" ADD COLUMN "activityStreakDays" INTEGER NOT NULL DEFAULT 0;

-- Дата последней активности для расчёта стрика
ALTER TABLE "User" ADD COLUMN "lastActivityDate" DATETIME;

-- Максимальный стрик (рекорд)
ALTER TABLE "User" ADD COLUMN "maxActivityStreak" INTEGER NOT NULL DEFAULT 0;
