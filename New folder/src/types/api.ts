/**
 * The kinds of outcome the HTTP client can distinguish for callers.
 * Mirrors the status codes the backend actually returns (see
 * server/src/controllers/*.ts) rather than a generic HTTP taxonomy.
 */
export type ApiErrorKind =
  | "bad_request" // 400
  | "unauthorized" // 401
  | "forbidden" // 403
  | "not_found" // 404
  | "conflict" // 409
  | "server_error" // 500+
  | "network_error"; // fetch itself failed (offline, backend down, CORS, etc.)

/**
 * Thrown by the HTTP client for any non-2xx response or network failure.
 * `message` preserves the backend's own `error` string where available,
 * instead of being replaced with a generic one.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly details?: unknown;

  constructor(
    message: string,
    kind: ApiErrorKind,
    status: number | null,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.details = details;
  }
}
