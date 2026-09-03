import { useAuth } from "../../context/AuthContext";

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="app-header__left">
        <button
          type="button"
          className="app-header__menu-toggle"
          onClick={onToggleSidebar}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
          aria-label={
            sidebarOpen ? "Close navigation menu" : "Open navigation menu"
          }
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>

        <div className="app-header__brand">
          <span className="brand-mark" aria-hidden="true" />
          <div className="app-header__brand-text">
            <span className="app-header__title">Sanisa Compliance</span>
            <span className="app-header__tag">KYC / AML Platform</span>
          </div>
        </div>
      </div>

      {user && (
        <div className="app-header__account">
          <div className="app-header__identity">
            <span className="app-header__name">{user.name}</span>
            <span className="app-header__meta">
              {user.email} · {user.role}
            </span>
          </div>
          <button type="button" className="app-header__logout" onClick={logout}>
            Log out
          </button>
        </div>
      )}
    </header>
  );
}

export default Header;
