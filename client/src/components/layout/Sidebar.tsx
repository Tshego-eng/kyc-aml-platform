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
 * guards, not this list. Section/icon grouping is purely presentational.
 */
function Sidebar({ open, onNavigate }: SidebarProps) {
  const { hasAnyRole } = useRole();
  const visibleNavItems = navItems.filter((item) =>
    canSeeNavItem(item, hasAnyRole)
  );

  const sections: string[] = [];
  for (const item of visibleNavItems) {
    if (!sections.includes(item.section)) {
      sections.push(item.section);
    }
  }

  return (
    <nav
      id="app-sidebar"
      className={`app-sidebar${open ? " app-sidebar--open" : ""}`}
      aria-label="Primary"
    >
      <div className="app-sidebar__scroll">
        {sections.map((section) => (
          <div className="app-sidebar__section" key={section}>
            <span className="app-sidebar__section-title">{section}</span>
            <ul className="app-sidebar__list">
              {visibleNavItems
                .filter((item) => item.section === section)
                .map((item) => (
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
                      <i className={`bi ${item.icon}`} aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

export default Sidebar;
