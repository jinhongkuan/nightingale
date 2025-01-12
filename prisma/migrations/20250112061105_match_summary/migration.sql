/*
  Warnings:

  - Added the required column `summary` to the `QueryMatch` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "QueryMatch" ADD COLUMN     "summary" TEXT NOT NULL;
