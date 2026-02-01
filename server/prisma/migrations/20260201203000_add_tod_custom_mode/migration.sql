-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "customMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Round" ADD COLUMN     "customAuthorPlayerId" TEXT;

-- NOTE (SQLite): adding a foreign key constraint via ALTER TABLE is not supported.
-- We keep the field without a FK constraint.
