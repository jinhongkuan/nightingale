-- DropForeignKey
ALTER TABLE "QueryMatch" DROP CONSTRAINT "QueryMatch_githubUserId_fkey";

-- AlterTable
ALTER TABLE "QueryMatch" ADD COLUMN     "linkedinProfileId" TEXT,
ALTER COLUMN "githubUserId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "LinkedinProfile" (
    "id" TEXT NOT NULL,
    "linkedInId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkedinProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinkedinProfile_linkedInId_key" ON "LinkedinProfile"("linkedInId");

-- AddForeignKey
ALTER TABLE "QueryMatch" ADD CONSTRAINT "QueryMatch_githubUserId_fkey" FOREIGN KEY ("githubUserId") REFERENCES "GithubUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryMatch" ADD CONSTRAINT "QueryMatch_linkedinProfileId_fkey" FOREIGN KEY ("linkedinProfileId") REFERENCES "LinkedinProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
