-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_REVIEW');

-- CreateTable
CREATE TABLE "KYCReview" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KYCReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KYCReview_customerId_idx" ON "KYCReview"("customerId");

-- CreateIndex
CREATE INDEX "KYCReview_reviewerId_idx" ON "KYCReview"("reviewerId");

-- CreateIndex
CREATE INDEX "KYCReview_decision_idx" ON "KYCReview"("decision");

-- CreateIndex
CREATE INDEX "KYCReview_createdAt_idx" ON "KYCReview"("createdAt");

-- AddForeignKey
ALTER TABLE "KYCReview" ADD CONSTRAINT "KYCReview_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KYCReview" ADD CONSTRAINT "KYCReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
