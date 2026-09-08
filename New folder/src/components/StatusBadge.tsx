import type { BadgeTone } from "../utils/format";

interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
}

// Tone is always paired with the real backend label text, so status is
// never conveyed by color alone.
function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{label}</span>;
}

export default StatusBadge;
