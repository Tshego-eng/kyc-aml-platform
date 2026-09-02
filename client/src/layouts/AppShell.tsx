import { NavLink, Outlet } from "react-router-dom";
import { useRole } from "../hooks/useRole";
import { navItems, canSeeNavItem } from "../routes/navConfig";

function AppShell() {
  const { hasAnyRole } = useRole();

  const visibleNavItems = navItems.filter((item) =>
    canSeeNavItem(item, hasAnyRole)
  );

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__brand">
          <span className="app-shell__mark" aria-hidden="true" />
          <span className="app-shell__title">Sanisa Compliance</span>
        </div>

        {visibleNavItems.length > 0 && (
          <nav className="app-shell__nav" aria-label="Primary">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  isActive
                    ? "app-shell__nav-link app-shell__nav-link--active"
                    : "app-shell__nav-link"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        <span className="app-shell__tag">KYC / AML Platform</span>
      </header>

      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
