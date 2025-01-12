/*
  Warnings:

  - You are about to drop the column `initiatorId` on the `Query` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Query" DROP CONSTRAINT "Query_initiatorId_fkey";

-- AlterTable
ALTER TABLE "Query" DROP COLUMN "initiatorId";
