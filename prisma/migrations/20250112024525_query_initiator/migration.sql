/*
  Warnings:

  - You are about to drop the column `initiatorId` on the `QueryTask` table. All the data in the column will be lost.
  - Added the required column `initiatorId` to the `Query` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "QueryTask" DROP CONSTRAINT "QueryTask_initiatorId_fkey";

-- AlterTable
ALTER TABLE "Query" ADD COLUMN     "initiatorId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "QueryTask" DROP COLUMN "initiatorId";

-- AddForeignKey
ALTER TABLE "Query" ADD CONSTRAINT "Query_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
