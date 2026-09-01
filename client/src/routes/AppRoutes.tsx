import { Routes, Route } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import LandingPage from "../pages/LandingPage";

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<LandingPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
