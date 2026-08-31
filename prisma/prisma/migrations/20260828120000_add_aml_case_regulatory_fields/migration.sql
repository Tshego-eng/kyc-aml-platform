-- Store the regulatory outcome and its supporting reason on AML cases.
CREATE TYPE "RegulatoryDecision" AS ENUM (
  'FALSE_POSITIVE',
  'NO_FURTHER_ACTION',
  'INTERNAL_ESCALATION',
  'REGULATORY_REPORT'
);

ALTER TABLE "AMLCase"
  ADD COLUMN "regulatoryDecision" "RegulatoryDecision",
  ADD COLUMN "regulatoryReason" TEXT;