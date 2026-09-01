interface StatusRowProps {
  label: string;
  value: string;
}

function StatusRow({ label, value }: StatusRowProps) {
  return (
    <div className="status-row">
      <span className="status-row__label">{label}</span>
      <span className="status-row__value">{value}</span>
    </div>
  );
}

export default StatusRow;
