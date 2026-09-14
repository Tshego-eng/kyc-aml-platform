import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../hooks/useRole";
import { navItems, canSeeNavItem } from "../routes/navConfig";
import { humanizeLabel } from "../utils/format";

const CAPABILITIES = [
  {
    icon: "bi-person-badge",
    title: "KYC & Customer Management",
    points: ["Customer onboarding", "Identity verification", "KYC status", "Customer risk"],
  },
  {
    icon: "bi-shield-exclamation",
    title: "AML Monitoring",
    points: ["Transaction monitoring", "AML rules", "Suspicious activity detection", "Alerts"],
  },
  {
    icon: "bi-briefcase",
    title: "Case Management",
    points: ["Case assignment", "Investigation", "Evidence", "Notes", "Case resolution"],
  },
  {
    icon: "bi-graph-up-arrow",
    title: "Risk Intelligence",
    points: ["Customer risk scoring", "Risk factors", "Risk trends"],
  },
  {
    icon: "bi-file-earmark-text",
    title: "Regulatory Reporting",
    points: ["Regulatory reports", "Submission lifecycle", "Compliance tracking"],
  },
  {
    icon: "bi-clock-history",
    title: "Audit & Administration",
    points: ["Audit logs", "RBAC", "User administration"],
  },
];

/**
 * Authenticated landing page. Quick actions reuse the exact same
 * navConfig/RBAC filtering as the sidebar (Step 33.4/33.5) — nothing
 * here is a second permissions system. Capability cards below are
 * static descriptive copy, not business data, so there's nothing to
 * fetch. A "recent activity" section was deliberately left out: it
 * would just duplicate the Dashboard's own recent-activity panel one
 * click away, at the cost of an extra API call on every visit here.
 */
function LandingPage() {
  const { user } = useAuth();
  const { hasAnyRole } = useRole();

  const quickActions = navItems.filter(
    (item) =>
      item.path !== "/" &&
      item.path !== "/rbac-check/admin" &&
      canSeeNavItem(item, hasAnyRole)
  );

  return (
    <section className="landing-hub">
      <div className="landing-hub__intro">
        <h1 className="landing-hub__heading">KYC / AML Compliance Platform</h1>
        <p className="landing-hub__subheading">
          Centralized compliance operations for customer due diligence,
          transaction monitoring, AML investigations, and regulatory
          reporting.
        </p>
      </div>

      {user && (
        <div className="landing-hub__welcome">
          <div>
            <span className="landing-hub__welcome-label">
              Welcome back, {user.name}
            </span>
            <span className="landing-hub__welcome-role">
              Role: {humanizeLabel(user.role)}
            </span>
          </div>
        </div>
      )}

      {quickActions.length > 0 && (
        <div className="landing-hub__section">
          <h2 className="dashboard__section-heading">Quick actions</h2>
          <div className="quick-action-grid">
            {quickActions.map((item) => (
              <Link key={item.path} to={item.path} className="quick-action-card">
                <i className={`bi ${item.icon}`} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="landing-hub__section">
        <h2 className="dashboard__section-heading">Platform capabilities</h2>
        <div className="capability-grid">
          {CAPABILITIES.map((capability) => (
            <div key={capability.title} className="capability-card">
              <i className={`bi ${capability.icon}`} aria-hidden="true" />
              <h3 className="capability-card__title">{capability.title}</h3>
              <ul className="capability-card__list">
                {capability.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default LandingPage;
