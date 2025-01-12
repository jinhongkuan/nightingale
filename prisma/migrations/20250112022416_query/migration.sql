-- CreateEnum
CREATE TYPE "QueryTaskState" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "GithubUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GithubUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Query" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Query_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryTask" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "taskState" "QueryTaskState" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueryTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryMatch" (
    "id" TEXT NOT NULL,
    "queryTaskId" TEXT NOT NULL,
    "githubUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueryMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GithubUser_username_key" ON "GithubUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Query_taskId_key" ON "Query"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "QueryTask_queryId_key" ON "QueryTask"("queryId");

-- AddForeignKey
ALTER TABLE "QueryTask" ADD CONSTRAINT "QueryTask_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "Query"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryTask" ADD CONSTRAINT "QueryTask_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryMatch" ADD CONSTRAINT "QueryMatch_queryTaskId_fkey" FOREIGN KEY ("queryTaskId") REFERENCES "QueryTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryMatch" ADD CONSTRAINT "QueryMatch_githubUserId_fkey" FOREIGN KEY ("githubUserId") REFERENCES "GithubUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
