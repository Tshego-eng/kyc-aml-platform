import { API_BASE_URL } from "./config";
import { getAuthToken } from "./authToken";
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

async function request<T>(
  path: string,
  method: HttpMethod,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const token = getAuthToken();
  if (token) {
    // Matches server/src/middleware/auth.middleware.ts, which expects
    // "Authorization: Bearer <token>".
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
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
    throw new ApiError(
      extractErrorMessage(payload, response.status),
      errorKindForStatus(response.status),
      response.status,
      extractErrorDetails(payload)
    );
  }

  return payload as T;
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
};
