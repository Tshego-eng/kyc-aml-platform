import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";

/**
 * Reusable authenticated shell: header + sidebar + main content outlet.
 * Always rendered under <ProtectedRoute>, so auth is already guaranteed
 * by the time this mounts. Future pages plug into the <Outlet /> without
 * touching header, sidebar, auth, or role logic.
 */
function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
      />

      <div className="app-shell__body">
        <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

        {sidebarOpen && (
          <button
            type="button"
            className="app-shell__backdrop"
            aria-label="Close navigation menu"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
