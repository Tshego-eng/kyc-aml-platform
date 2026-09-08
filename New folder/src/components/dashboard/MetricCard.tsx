import { Link } from "react-router-dom";

interface MetricCardProps {
  title: string;
  value: string;
  description?: string;
  linkTo?: string;
  linkLabel?: string;
}

function MetricCard({
  title,
  value,
  description,
  linkTo,
  linkLabel,
}: MetricCardProps) {
  return (
    <div className="metric-card">
      <span className="metric-card__title">{title}</span>
      <span className="metric-card__value">{value}</span>
      {description && (
        <span className="metric-card__description">{description}</span>
      )}
      {linkTo && linkLabel && (
        <Link className="metric-card__link" to={linkTo}>
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

export default MetricCard;
