import { httpClient } from "./httpClient";
import type {
  LoginRequest,
  LoginResponse,
  CurrentUserResponse,
} from "../types/auth";

// POST /api/auth/login
export function login(credentials: LoginRequest): Promise<LoginResponse> {
  return httpClient.post<LoginResponse>("/auth/login", credentials);
}

// GET /api/auth/me — used to validate a stored token and fetch the
// current user on page reload. There is no logout endpoint: JWT auth
// here is stateless, so logout is purely a frontend state/token clear.
export function getCurrentUser(): Promise<CurrentUserResponse> {
  return httpClient.get<CurrentUserResponse>("/auth/me");
}
