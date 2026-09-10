import { httpClient } from "./httpClient";
import type {
  LoginRequest,
  LoginResponse,
  CurrentUserResponse,
  RegisterRequest,
  RegisterResponse,
} from "../types/auth";

// POST /api/auth/login
export function login(credentials: LoginRequest): Promise<LoginResponse> {
  return httpClient.post<LoginResponse>("/auth/login", credentials);
}

// POST /api/auth/register — always creates an ANALYST account; the
// backend ignores any role the client might send. This function
// deliberately does not store the returned token: the app's preferred
// flow is register -> redirect to /login -> the user signs in normally
// through the existing, already-tested login path, rather than wiring
// a second auto-login flow into AuthContext.
export function register(
  input: RegisterRequest
): Promise<RegisterResponse> {
  return httpClient.post<RegisterResponse>("/auth/register", input);
}

// GET /api/auth/me — used to validate a stored token and fetch the
// current user on page reload. There is no logout endpoint: JWT auth
// here is stateless, so logout is purely a frontend state/token clear.
export function getCurrentUser(): Promise<CurrentUserResponse> {
  return httpClient.get<CurrentUserResponse>("/auth/me");
}
