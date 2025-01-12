/*
  Warnings:

  - Added the required column `metadata` to the `Query` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Query" ADD COLUMN     "metadata" JSONB NOT NULL;
