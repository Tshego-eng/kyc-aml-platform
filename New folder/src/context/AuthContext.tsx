import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { login as loginRequest, getCurrentUser } from "../services/auth.service";
import { setAuthToken } from "../services/authToken";
import type { AuthUser } from "../types/auth";

// The backend issues a stateless JWT with no server-side session, so the
// frontend is responsible for persisting it across reloads. localStorage
// is used here since there is no cookie set by the backend to rely on.
const TOKEN_STORAGE_KEY = "kycAml.authToken";

type AuthStatus = "initializing" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // If there's no stored token, we already know the final status up
  // front, so it's set via the initializer rather than in the effect
  // below (avoids an unnecessary synchronous setState-in-effect).
  const [status, setStatus] = useState<AuthStatus>(() =>
    readStoredToken() ? "initializing" : "unauthenticated"
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Session restoration: on load, if a token was saved from a previous
  // visit, validate it against GET /api/auth/me rather than trusting it
  // blindly. This also refreshes the user's profile fields.
  useEffect(() => {
    const storedToken = readStoredToken();

    if (!storedToken) {
      return;
    }

    setAuthToken(storedToken);

    getCurrentUser()
      .then((result) => {
        setToken(storedToken);
        setUser(result.user);
        setStatus("authenticated");
      })
      .catch(() => {
        // Invalid, expired, or unverifiable token (including the backend
        // being unreachable) — fall back to a clean unauthenticated state
        // rather than leaving the app in limbo.
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setAuthToken(null);
        setStatus("unauthenticated");
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest({ email, password });
    localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
    setAuthToken(result.token);
    setToken(result.token);
    setUser(result.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(() => {
    // No backend logout endpoint exists (stateless JWT) — logging out is
    // purely clearing local state and the stored token.
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
