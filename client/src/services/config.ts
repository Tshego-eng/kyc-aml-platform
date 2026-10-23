/**
 * Runtime configuration read from environment variables (see .env.example).
 * Accepts either the API origin or an origin that already ends in /api.
 * Nothing here should ever hold a hardcoded production value.
 */

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!rawApiBaseUrl) {
  // Fails fast in dev if someone forgets to copy .env.example to .env.
  throw new Error(
    "VITE_API_BASE_URL is not set. Copy client/.env.example to client/.env and set it."
  );
}

const normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/+$/, "");

export const API_BASE_URL: string = /\/api$/i.test(normalizedApiBaseUrl)
  ? normalizedApiBaseUrl
  : `${normalizedApiBaseUrl}/api`;
