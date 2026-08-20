-- Prevent the same AML rule from creating duplicate alerts for one transaction.
CREATE UNIQUE INDEX "AMLAlert_transactionId_type_key"
ON "AMLAlert"("transactionId", "type");