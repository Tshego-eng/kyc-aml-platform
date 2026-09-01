import { Outlet } from "react-router-dom";

function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__brand">
          <span className="app-shell__mark" aria-hidden="true" />
          <span className="app-shell__title">Sanisa Compliance</span>
        </div>
        <span className="app-shell__tag">KYC / AML Platform</span>
      </header>

      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
