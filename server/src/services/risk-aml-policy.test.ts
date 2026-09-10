import assert from "node:assert/strict";
import { getLargeTransactionSeverity } from "./aml.service";
import { getCaseEscalationReasons } from "./case-escalation.service";
import {
  getAMLAlertRiskContribution,
  getRiskLevelForScore,
} from "./risk.service";

const thresholds = {
  largeTransactionAmount: 100000,
  highRiskCountries: ["countrya", "countryb"],
};

assert.deepEqual(getAMLAlertRiskContribution([]), {
  score: 0,
  reasons: [],
});
assert.equal(getRiskLevelForScore(0), "LOW");

assert.equal(
  getAMLAlertRiskContribution([
    { severity: "HIGH", status: "OPEN" },
  ]).score,
  10
);
assert.equal(getRiskLevelForScore(10), "LOW");

assert.equal(
  getAMLAlertRiskContribution([
    { severity: "HIGH", status: "OPEN" },
    { severity: "HIGH", status: "INVESTIGATING" },
  ]).score,
  35
);
assert.equal(getRiskLevelForScore(35), "MEDIUM");
assert.equal(getRiskLevelForScore(50), "HIGH");
assert.equal(getRiskLevelForScore(75), "CRITICAL");

assert.equal(
  getAMLAlertRiskContribution([
    { severity: "HIGH", status: "FALSE_POSITIVE" },
    { severity: "CRITICAL", status: "RESOLVED" },
  ]).score,
  0
);

assert.equal(
  getLargeTransactionSeverity(100000, "CountryA", thresholds),
  "HIGH"
);
assert.equal(
  getLargeTransactionSeverity(200000, "CountryA", thresholds),
  "CRITICAL"
);
assert.equal(
  getLargeTransactionSeverity(200000, "CountryZ", thresholds),
  "HIGH"
);
assert.equal(
  getLargeTransactionSeverity(99999, "CountryA", thresholds),
  null
);

assert.equal(
  getCaseEscalationReasons({
    riskLevel: "CRITICAL",
    criticalAlertCount: 0,
    highAlertCount: 0,
    failedKYCCheckCount: 0,
  }).length,
  1
);
assert.deepEqual(
  getCaseEscalationReasons({
    riskLevel: "HIGH",
    criticalAlertCount: 0,
    highAlertCount: 0,
    failedKYCCheckCount: 0,
  }),
  ["HIGH customer risk level"]
);
assert.equal(
  getCaseEscalationReasons({
    riskLevel: "HIGH",
    criticalAlertCount: 1,
    highAlertCount: 2,
    failedKYCCheckCount: 1,
  }).length,
  4
);

console.log("Risk and AML policy tests passed.");
