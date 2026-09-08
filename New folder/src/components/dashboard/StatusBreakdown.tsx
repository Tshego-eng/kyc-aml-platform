interface StatusBreakdownEntry {
  label: string;
  value: number;
}

interface StatusBreakdownProps {
  title: string;
  entries: StatusBreakdownEntry[];
}

/**
 * Proportional bar list for a set of real backend-provided counts.
 * The percentage and count are always shown as text, so the active
 * state/relative size is never conveyed by the bar fill alone.
 */
function StatusBreakdown({ title, entries }: StatusBreakdownProps) {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="status-breakdown">
      <h3 className="status-breakdown__title">{title}</h3>
      {total === 0 ? (
        <p className="status-breakdown__empty">No data yet.</p>
      ) : (
        <ul className="status-breakdown__list">
          {entries.map((entry) => {
            const percentage =
              total > 0 ? Math.round((entry.value / total) * 100) : 0;
            return (
              <li key={entry.label} className="status-breakdown__row">
                <div className="status-breakdown__row-header">
                  <span>{entry.label}</span>
                  <span className="status-breakdown__row-value">
                    {entry.value.toLocaleString()} ({percentage}%)
                  </span>
                </div>
                <div className="status-breakdown__bar-track">
                  <div
                    className="status-breakdown__bar-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default StatusBreakdown;
