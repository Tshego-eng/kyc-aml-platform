import { Routes, Route } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import CustomersPage from "../pages/CustomersPage";
import CustomerProfilePage from "../pages/CustomerProfilePage";
import AMLAlertsPage from "../pages/AMLAlertsPage";
import AMLAlertDetailPage from "../pages/AMLAlertDetailPage";
import AMLCasesPage from "../pages/AMLCasesPage";
import AMLCaseDetailPage from "../pages/AMLCaseDetailPage";
import InvestigationWorkspacePage from "../pages/InvestigationWorkspacePage";
import RiskIntelligencePage from "../pages/RiskIntelligencePage";
import RbacCheckPage from "../pages/RbacCheckPage";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route
            element={
              <RoleRoute
                allowedRoles={["ADMIN", "COMPLIANCE_OFFICER", "ANALYST"]}
              />
            }
          >
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:id" element={<CustomerProfilePage />} />
            <Route path="/aml-alerts" element={<AMLAlertsPage />} />
            <Route path="/aml-alerts/:id" element={<AMLAlertDetailPage />} />
            <Route path="/aml-cases" element={<AMLCasesPage />} />
            <Route path="/aml-cases/:id" element={<AMLCaseDetailPage />} />
            <Route
              path="/aml-cases/:id/investigation"
              element={<InvestigationWorkspacePage />}
            />
            <Route path="/risk-intelligence" element={<RiskIntelligencePage />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={["ADMIN"]} />}>
            <Route path="/rbac-check/admin" element={<RbacCheckPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
