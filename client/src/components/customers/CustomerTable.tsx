import { Link } from "react-router-dom";
import type { Customer } from "../../types/customer";
import StatusBadge from "../StatusBadge";
import { formatDateTime, humanizeLabel, kycStatusTone } from "../../utils/format";

interface CustomerTableProps {
  customers: Customer[];
}

function CustomerTable({ customers }: CustomerTableProps) {
  if (customers.length === 0) {
    return <p className="customer-table__empty">No customers match your search.</p>;
  }

  return (
    <div className="customer-table-wrapper">
      <table className="customer-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">ID number</th>
            <th scope="col">Country</th>
            <th scope="col">KYC status</th>
            <th scope="col">Created</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>
                <Link
                  className="customer-table__link"
                  to={`/customers/${customer.id}`}
                >
                  {customer.firstName} {customer.lastName}
                </Link>
              </td>
              <td>{customer.email ?? "—"}</td>
              <td className="customer-table__mono">{customer.idNumber}</td>
              <td>{customer.country}</td>
              <td>
                <StatusBadge
                  label={humanizeLabel(customer.kycStatus)}
                  tone={kycStatusTone(customer.kycStatus)}
                />
              </td>
              <td>{formatDateTime(customer.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CustomerTable;
