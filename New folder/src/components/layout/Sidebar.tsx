import { NavLink } from "react-router-dom";
import { useRole } from "../../hooks/useRole";
import { navItems, canSeeNavItem } from "../../routes/navConfig";

interface SidebarProps {
  open: boolean;
  onNavigate: () => void;
}

/**
 * Reuses the 33.4 RBAC helper (useRole) and the centralized nav config
 * to decide what's visible. This filtering is UX only — the actual
 * security boundary is the backend plus the RoleRoute/ProtectedRoute
 * guards, not this list.
 */
function Sidebar({ open, onNavigate }: SidebarProps) {
  const { hasAnyRole } = useRole();
  const visibleNavItems = navItems.filter((item) =>
    canSeeNavItem(item, hasAnyRole)
  );

  return (
    <nav
      id="app-sidebar"
      className={`app-sidebar${open ? " app-sidebar--open" : ""}`}
      aria-label="Primary"
    >
      <ul className="app-sidebar__list">
        {visibleNavItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              end={item.path === "/"}
              onClick={onNavigate}
              className={({ isActive }) =>
                isActive
                  ? "app-sidebar__link app-sidebar__link--active"
                  : "app-sidebar__link"
              }
            >
              <span className="app-sidebar__indicator" aria-hidden="true" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Sidebar;
