interface MetricCardProps {
  title: string;
  value: string;
  description?: string;
}

function MetricCard({ title, value, description }: MetricCardProps) {
  return (
    <div className="metric-card">
      <span className="metric-card__title">{title}</span>
      <span className="metric-card__value">{value}</span>
      {description && (
        <span className="metric-card__description">{description}</span>
      )}
    </div>
  );
}

export default MetricCard;
