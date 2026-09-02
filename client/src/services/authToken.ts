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
