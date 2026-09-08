import { useEffect, useState } from "react";
import { API_BASE_URL } from "../services/config";
import { checkHealth } from "../services/health.service";
import { ApiError } from "../types/api";
import StatusRow from "../components/StatusRow";

type ConnectivityState =
  | { phase: "checking" }
  | { phase: "connected"; message: string }
  | { phase: "error"; message: string };

function connectivityValue(state: ConnectivityState): string {
  switch (state.phase) {
    case "checking":
      return "Checking...";
    case "connected":
      return `Connected — ${state.message}`;
    case "error":
      return `Unreachable — ${state.message}`;
  }
}

function LandingPage() {
  const [connectivity, setConnectivity] = useState<ConnectivityState>({
    phase: "checking",
  });

  useEffect(() => {
    let cancelled = false;

    // Frontend -> httpClient -> GET /api/health -> backend response.
    // Proves the API client can reach the real backend, using an
    // existing safe endpoint rather than any invented one.
    checkHealth()
      .then((result) => {
        if (!cancelled) {
          setConnectivity({ phase: "connected", message: result.message });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof ApiError
            ? error.message
            : "Unable to reach the backend.";
        setConnectivity({ phase: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="landing">
      <div className="landing__intro">
        <h1 className="landing__heading">
          The compliance workspace foundation is running.
        </h1>
        <p className="landing__body">
          This is a placeholder screen. The customer, KYC, AML, and
          reporting workflows are built on top of this shell in later
          steps.
        </p>
      </div>

      <div className="landing__status" role="table" aria-label="Frontend status">
        <StatusRow label="Frontend" value="Running" />
        <StatusRow label="Environment" value={import.meta.env.MODE} />
        <StatusRow label="API base URL" value={API_BASE_URL} />
        <StatusRow
          label="Backend connectivity"
          value={connectivityValue(connectivity)}
        />
      </div>
    </section>
  );
}

export default LandingPage;
