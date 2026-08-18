-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'ESCALATED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CaseDecision" AS ENUM ('NO_ACTION', 'SUSPICIOUS_ACTIVITY', 'FALSE_POSITIVE', 'ESCALATE');

-- CreateTable
CREATE TABLE "AMLCase" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "decision" "CaseDecision",
    "summary" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "AMLCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationNote" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestigationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseEvidence" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AMLCase_alertId_key" ON "AMLCase"("alertId");

-- CreateIndex
CREATE INDEX "AMLCase_customerId_idx" ON "AMLCase"("customerId");

-- CreateIndex
CREATE INDEX "AMLCase_assignedToId_idx" ON "AMLCase"("assignedToId");

-- CreateIndex
CREATE INDEX "AMLCase_status_idx" ON "AMLCase"("status");

-- CreateIndex
CREATE INDEX "AMLCase_createdAt_idx" ON "AMLCase"("createdAt");

-- CreateIndex
CREATE INDEX "InvestigationNote_caseId_idx" ON "InvestigationNote"("caseId");

-- CreateIndex
CREATE INDEX "InvestigationNote_authorId_idx" ON "InvestigationNote"("authorId");

-- CreateIndex
CREATE INDEX "InvestigationNote_createdAt_idx" ON "InvestigationNote"("createdAt");

-- CreateIndex
CREATE INDEX "CaseEvidence_caseId_idx" ON "CaseEvidence"("caseId");

-- CreateIndex
CREATE INDEX "CaseEvidence_uploadedBy_idx" ON "CaseEvidence"("uploadedBy");

-- AddForeignKey
ALTER TABLE "AMLCase" ADD CONSTRAINT "AMLCase_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "AMLAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AMLCase" ADD CONSTRAINT "AMLCase_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AMLCase" ADD CONSTRAINT "AMLCase_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationNote" ADD CONSTRAINT "InvestigationNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "AMLCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationNote" ADD CONSTRAINT "InvestigationNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvidence" ADD CONSTRAINT "CaseEvidence_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "AMLCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvidence" ADD CONSTRAINT "CaseEvidence_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
