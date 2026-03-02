-- Добавляем поле tag для уникального идентификатора пользователя (Discord-style #0001-#9999)
ALTER TABLE "User" ADD COLUMN "tag" TEXT;

-- Генерируем уникальные теги для существующих пользователей
-- Для каждого пользователя генерируем случайный 4-значный тег
UPDATE "User" SET "tag" = printf('%04d', abs(random()) % 10000) WHERE "tag" IS NULL;

-- Создаём индексы для поиска
CREATE INDEX "User_nickname_idx" ON "User"("nickname");
CREATE INDEX "User_tag_idx" ON "User"("tag");

-- Создаём уникальный индекс для комбинации nickname+tag
CREATE UNIQUE INDEX "User_nickname_tag_key" ON "User"("nickname", "tag");
