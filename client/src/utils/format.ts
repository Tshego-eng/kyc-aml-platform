/**
 * Converts a backend SNAKE_CASE enum value into a human-friendly label
 * without changing its meaning (e.g. "FALSE_POSITIVE" -> "False Positive").
 */
export function humanizeLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Formats a monetary amount using the currency the backend actually
 * returned for that value — never an assumed default.
 */
export function formatCurrencyAmount(amount: string, currency: string): string {
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    return `${amount} ${currency}`;
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    // Intl throws for a currency code it doesn't recognize.
    return `${numeric.toLocaleString()} ${currency}`;
  }
}

export type BadgeTone = "neutral" | "positive" | "warning" | "negative";

export function kycStatusTone(status: string): BadgeTone {
  if (status === "VERIFIED") return "positive";
  if (status === "PENDING") return "warning";
  if (status === "REJECTED") return "negative";
  return "neutral";
}

export function checkStatusTone(status: string): BadgeTone {
  if (status === "PASSED") return "positive";
  if (status === "FAILED") return "negative";
  return "neutral";
}

export function riskLevelTone(level: string): BadgeTone {
  if (level === "LOW") return "positive";
  if (level === "MEDIUM") return "warning";
  if (level === "HIGH" || level === "CRITICAL") return "negative";
  return "neutral";
}

export function reviewDecisionTone(decision: string): BadgeTone {
  if (decision === "APPROVE") return "positive";
  if (decision === "REJECT") return "negative";
  return "warning"; // REQUEST_REVIEW
}
