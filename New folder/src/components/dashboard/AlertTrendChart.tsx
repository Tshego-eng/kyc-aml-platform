import type { AmlAlertTrendPoint } from "../../types/dashboard";

interface AlertTrendChartProps {
  points: AmlAlertTrendPoint[];
}

const WIDTH = 640;
const HEIGHT = 180;
const PADDING = 24;

/**
 * Hand-rolled SVG line chart — no charting library needed for a single
 * series over at most a few dozen real data points from
 * GET /api/dashboard/aml/trends. Only rendered when the backend
 * actually has alert activity for the period.
 */
function AlertTrendChart({ points }: AlertTrendChartProps) {
  if (points.length === 0) {
    return (
      <p className="alert-trend-chart__empty">
        No AML alert activity in this period.
      </p>
    );
  }

  const maxTotal = Math.max(...points.map((point) => point.total), 1);
  const stepX =
    points.length > 1 ? (WIDTH - PADDING * 2) / (points.length - 1) : 0;

  const coordinates = points.map((point, index) => {
    const x = PADDING + stepX * index;
    const y =
      HEIGHT - PADDING - (point.total / maxTotal) * (HEIGHT - PADDING * 2);
    return { x, y, point };
  });

  const linePath = coordinates
    .map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`)
    .join(" ");

  const totalAlerts = points.reduce((sum, point) => sum + point.total, 0);
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <div className="alert-trend-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-labelledby="alert-trend-chart-title"
        className="alert-trend-chart__svg"
        preserveAspectRatio="none"
      >
        <title id="alert-trend-chart-title">
          {`AML alerts created per day, ${first.date} to ${last.date}`}
        </title>
        <line
          x1={PADDING}
          y1={HEIGHT - PADDING}
          x2={WIDTH - PADDING}
          y2={HEIGHT - PADDING}
          className="alert-trend-chart__axis"
        />
        <path d={linePath} className="alert-trend-chart__line" fill="none" />
        {coordinates.map((coord) => (
          <circle
            key={coord.point.date}
            cx={coord.x}
            cy={coord.y}
            r={2.5}
            className="alert-trend-chart__point"
          />
        ))}
      </svg>
      <p className="alert-trend-chart__summary">
        {totalAlerts.toLocaleString()} alert{totalAlerts === 1 ? "" : "s"}{" "}
        from {first.date} to {last.date}.
      </p>
    </div>
  );
}

export default AlertTrendChart;
