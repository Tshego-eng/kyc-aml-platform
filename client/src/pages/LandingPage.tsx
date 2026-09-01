import { API_BASE_URL } from "../services/config";
import StatusRow from "../components/StatusRow";

function LandingPage() {
  return (
    <section className="landing">
      <div className="landing__intro">
        <h1 className="landing__heading">
          The compliance workspace foundation is running.
        </h1>
        <p className="landing__body">
          This is a placeholder screen. Authentication, the dashboard, and
          the customer, KYC, AML, and reporting workflows are built on top
          of this shell in later steps.
        </p>
      </div>

      <div className="landing__status" role="table" aria-label="Frontend status">
        <StatusRow label="Frontend" value="Running" />
        <StatusRow label="Environment" value={import.meta.env.MODE} />
        <StatusRow label="API base URL" value={API_BASE_URL} />
      </div>
    </section>
  );
}

export default LandingPage;
