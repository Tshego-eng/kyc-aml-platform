import { formatDateTime } from "../../utils/format";

interface ActivityItemProps {
  title: string;
  meta: string;
  timestamp: string;
  badge?: string;
}

function ActivityItem({ title, meta, timestamp, badge }: ActivityItemProps) {
  return (
    <li className="activity-item">
      <div className="activity-item__main">
        <span className="activity-item__title">{title}</span>
        <span className="activity-item__meta">{meta}</span>
      </div>
      <div className="activity-item__side">
        {badge && <span className="activity-item__badge">{badge}</span>}
        <time className="activity-item__time" dateTime={timestamp}>
          {formatDateTime(timestamp)}
        </time>
      </div>
    </li>
  );
}

export default ActivityItem;
