/*
  Warnings:

  - You are about to drop the column `status` on the `Query` table. All the data in the column will be lost.
  - You are about to drop the column `taskState` on the `QueryTask` table. All the data in the column will be lost.
  - Added the required column `status` to the `QueryTask` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Query" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "QueryTask" DROP COLUMN "taskState",
ADD COLUMN     "status" "QueryTaskState" NOT NULL;
