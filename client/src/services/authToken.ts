/**
 * Holds the current JWT in memory so the HTTP client can attach it to
 * requests. Step 33.3 (authentication) is responsible for calling
 * setAuthToken() after login (backend returns { token, user } — see
 * server/src/controllers/auth.controller.ts) and clearing it on logout
 * or expiry. This module makes no assumption about where the token is
 * persisted across page reloads; that decision belongs to Step 33.3.
 */

let currentToken: string | null = null;

export function setAuthToken(token: string | null): void {
  currentToken = token;
}

export function getAuthToken(): string | null {
  return currentToken;
}

// Lets httpClient signal "the token we sent was rejected" (a genuine
// 401 on an authenticated request, e.g. an expired JWT mid-session)
// without importing AuthContext directly, avoiding a circular import.
// AuthContext registers itself as the listener and clears the session.
type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;

export function onUnauthorized(listener: UnauthorizedListener | null): void {
  unauthorizedListener = listener;
}

export function notifyUnauthorized(): void {
  unauthorizedListener?.();
}
