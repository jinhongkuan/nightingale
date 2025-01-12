/*
  Warnings:

  - Added the required column `taskState` to the `QueryTask` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `QueryTask` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "QueryTaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "QueryTask" ADD COLUMN     "taskState" JSONB NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "QueryTaskStatus" NOT NULL;

-- DropEnum
DROP TYPE "QueryTaskState";
