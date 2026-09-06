import { Link } from "react-router-dom";
import type { AMLAlertListItem } from "../../types/aml";
import StatusBadge from "../StatusBadge";
import {
  formatDateTime,
  humanizeLabel,
  alertStatusTone,
  riskLevelTone,
} from "../../utils/format";

interface AlertTableProps {
  alerts: AMLAlertListItem[];
}

function AlertTable({ alerts }: AlertTableProps) {
  if (alerts.length === 0) {
    return <p className="customer-table__empty">No alerts match your filters.</p>;
  }

  return (
    <div className="customer-table-wrapper">
      <table className="customer-table">
        <thead>
          <tr>
            <th scope="col">Customer</th>
            <th scope="col">Type</th>
            <th scope="col">Severity</th>
            <th scope="col">Status</th>
            <th scope="col">Created</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert) => (
            <tr key={alert.id}>
              <td>
                <Link className="customer-table__link" to={`/aml-alerts/${alert.id}`}>
                  {alert.customer.firstName} {alert.customer.lastName}
                </Link>
              </td>
              <td>{humanizeLabel(alert.type)}</td>
              <td>
                <StatusBadge
                  label={humanizeLabel(alert.severity)}
                  tone={riskLevelTone(alert.severity)}
                />
              </td>
              <td>
                <StatusBadge
                  label={humanizeLabel(alert.status)}
                  tone={alertStatusTone(alert.status)}
                />
              </td>
              <td>{formatDateTime(alert.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AlertTable;
