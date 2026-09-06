import { Link } from "react-router-dom";
import type { AMLCaseListItem } from "../../types/aml";
import StatusBadge from "../StatusBadge";
import {
  formatDateTime,
  humanizeLabel,
  caseStatusTone,
  riskLevelTone,
} from "../../utils/format";

interface CaseTableProps {
  cases: AMLCaseListItem[];
}

function CaseTable({ cases }: CaseTableProps) {
  if (cases.length === 0) {
    return <p className="customer-table__empty">No cases match your filters.</p>;
  }

  return (
    <div className="customer-table-wrapper">
      <table className="customer-table">
        <thead>
          <tr>
            <th scope="col">Customer</th>
            <th scope="col">Alert type</th>
            <th scope="col">Priority</th>
            <th scope="col">Status</th>
            <th scope="col">Assigned to</th>
            <th scope="col">Created</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((item) => (
            <tr key={item.id}>
              <td>
                <Link className="customer-table__link" to={`/aml-cases/${item.id}`}>
                  {item.customer.firstName} {item.customer.lastName}
                </Link>
              </td>
              <td>{humanizeLabel(item.alert.type)}</td>
              <td>
                <StatusBadge
                  label={humanizeLabel(item.priority)}
                  tone={riskLevelTone(item.priority)}
                />
              </td>
              <td>
                <StatusBadge
                  label={humanizeLabel(item.status)}
                  tone={caseStatusTone(item.status)}
                />
              </td>
              <td>{item.assignedTo ? item.assignedTo.name : "Unassigned"}</td>
              <td>{formatDateTime(item.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CaseTable;
