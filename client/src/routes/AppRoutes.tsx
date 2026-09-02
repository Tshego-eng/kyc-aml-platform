import { Routes, Route } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
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

          <Route element={<RoleRoute allowedRoles={["ADMIN"]} />}>
            <Route path="/rbac-check/admin" element={<RbacCheckPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
