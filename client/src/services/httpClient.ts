import { API_BASE_URL } from "./config";
import { getAuthToken, notifyUnauthorized } from "./authToken";
import { ApiError, type ApiErrorKind } from "../types/api";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface RequestOptions {
  body?: unknown;
  signal?: AbortSignal;
}

function errorKindForStatus(status: number): ApiErrorKind {
  switch (status) {
    case 400:
      return "bad_request";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    default:
      return status >= 500 ? "server_error" : "bad_request";
  }
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    // Backend controllers always respond with JSON; an unparsable body
    // is unexpected but shouldn't crash the caller.
    return undefined;
  }
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as { error: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error;
  }
  return `Request failed with status ${status}`;
}

function extractErrorDetails(payload: unknown): unknown {
  if (payload && typeof payload === "object" && "details" in payload) {
    return (payload as { details: unknown }).details;
  }
  return undefined;
}

/**
 * Shared low-level request path used by both the JSON client and the
 * multipart (file upload) client below, so auth-header attachment,
 * error mapping, and the 401 session-expiry signal only live in one
 * place. Content-Type is left to the caller: JSON requests set it
 * explicitly, multipart FormData requests must NOT set it (the browser
 * generates the correct boundary itself).
 */
async function requestRaw(
  path: string,
  init: { method: HttpMethod; headers: Record<string, string>; body?: BodyInit; signal?: AbortSignal }
): Promise<unknown> {
  const token = getAuthToken();
  const headers: Record<string, string> = { ...init.headers, Accept: "application/json" };
  if (token) {
    // Matches server/src/middleware/auth.middleware.ts, which expects
    // "Authorization: Bearer <token>".
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: init.method,
      headers,
      body: init.body,
      signal: init.signal,
    });
  } catch {
    throw new ApiError(
      "Unable to reach the server. Check your connection and try again.",
      "network_error",
      null
    );
  }

  const payload = await parseJsonBody(response);

  if (!response.ok) {
    if (response.status === 401 && token) {
      // The token we sent was rejected (expired/invalid JWT mid-session).
      // Distinct from a 401 with no token attached (e.g. bad login
      // credentials), which must never trigger a logout.
      notifyUnauthorized();
    }

    throw new ApiError(
      extractErrorMessage(payload, response.status),
      errorKindForStatus(response.status),
      response.status,
      extractErrorDetails(payload)
    );
  }

  return payload;
}

async function request<T>(
  path: string,
  method: HttpMethod,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const payload = await requestRaw(path, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  return payload as T;
}

async function requestFormData<T>(
  path: string,
  method: "POST" | "PATCH",
  formData: FormData,
  signal?: AbortSignal
): Promise<T> {
  const payload = await requestRaw(path, { method, headers: {}, body: formData, signal });
  return payload as T;
}

async function requestBlob(path: string): Promise<Blob> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method: "GET", headers });
  } catch {
    throw new ApiError(
      "Unable to reach the server. Check your connection and try again.",
      "network_error",
      null
    );
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      notifyUnauthorized();
    }
    // Error responses here are still JSON ({ error: "..." }), unlike
    // the successful binary response.
    const payload = await parseJsonBody(response);
    throw new ApiError(
      extractErrorMessage(payload, response.status),
      errorKindForStatus(response.status),
      response.status,
      extractErrorDetails(payload)
    );
  }

  return response.blob();
}

/**
 * Shared HTTP client for all API services. Base URL, JSON handling, auth
 * token attachment, and error mapping live here so individual services
 * (customers, KYC, AML alerts/cases, etc.) only need to describe their
 * own endpoints and response shapes.
 */
export const httpClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, "GET", options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, "POST", { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, "PATCH", { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, "DELETE", options),
  // For multipart/form-data uploads (e.g. evidence files) — the browser
  // sets Content-Type with the correct boundary itself.
  postFormData: <T>(path: string, formData: FormData, signal?: AbortSignal) =>
    requestFormData<T>(path, "POST", formData, signal),
  // For binary downloads (e.g. evidence file view/download) — returns a
  // Blob instead of parsing JSON.
  getBlob: (path: string) => requestBlob(path),
};
