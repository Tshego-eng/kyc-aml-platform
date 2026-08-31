-- CreateEnum
CREATE TYPE "RegulatoryReportType" AS ENUM ('SUSPICIOUS_ACTIVITY');

-- CreateEnum
CREATE TYPE "RegulatoryReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED');

-- CreateTable
CREATE TABLE "RegulatoryReport" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "reportType" "RegulatoryReportType" NOT NULL,
    "status" "RegulatoryReportStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "submittedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegulatoryReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegulatoryReport_caseId_idx" ON "RegulatoryReport"("caseId");

-- CreateIndex
CREATE INDEX "RegulatoryReport_customerId_idx" ON "RegulatoryReport"("customerId");

-- CreateIndex
CREATE INDEX "RegulatoryReport_submittedById_idx" ON "RegulatoryReport"("submittedById");

-- CreateIndex
CREATE INDEX "RegulatoryReport_status_idx" ON "RegulatoryReport"("status");

-- CreateIndex
CREATE INDEX "RegulatoryReport_createdAt_idx" ON "RegulatoryReport"("createdAt");

-- AddForeignKey
ALTER TABLE "RegulatoryReport" ADD CONSTRAINT "RegulatoryReport_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "AMLCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulatoryReport" ADD CONSTRAINT "RegulatoryReport_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulatoryReport" ADD CONSTRAINT "RegulatoryReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
