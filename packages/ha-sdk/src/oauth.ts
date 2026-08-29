import { normalizeBaseUrl } from "./base-url";

/**
 * Home Assistant OAuth2 without `getAuth()`, which reads `location` / `document`.
 * Bodies are form-urlencoded by hand so the shape does not depend on FormData.
 */

const AUTHORIZE_PATH = "/auth/authorize";
const TOKEN_PATH = "/auth/token";
const REVOKE_PATH = "/auth/revoke";

/**
 * Without this a token request against an unroutable address waits out the
 * platform default — a minute on iOS — with the app unable to move on to the
 * next address.
 */
const TOKEN_TIMEOUT_MS = 8000;

export interface HaTokens {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  /** Epoch milliseconds at which `accessToken` stops being accepted. */
  expires: number;
}

export type HaOAuthErrorKind = "invalid-grant" | "unreachable" | "unknown";

export class HaOAuthError extends Error {
  readonly kind: HaOAuthErrorKind;

  constructor(kind: HaOAuthErrorKind, message: string) {
    super(message);
    this.name = "HaOAuthError";
    this.kind = kind;
  }
}

export interface AuthorizeUrlOptions {
  baseUrl: string;
  clientId: string;
  redirectUri: string;
  state: string;
}

export function buildAuthorizeUrl(options: AuthorizeUrlOptions): string {
  const query = formBody({
    response_type: "code",
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    state: options.state,
  });
  return `${normalizeBaseUrl(options.baseUrl)}${AUTHORIZE_PATH}?${query}`;
}

export async function exchangeCode(options: {
  baseUrl: string;
  clientId: string;
  code: string;
}): Promise<HaTokens> {
  const payload = await postToken(options.baseUrl, {
    grant_type: "authorization_code",
    client_id: options.clientId,
    code: options.code,
  });

  if (!payload.refresh_token) {
    throw new HaOAuthError(
      "unknown",
      "Home Assistant returned no refresh token",
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    clientId: options.clientId,
    expires: expiresAt(payload.expires_in),
  };
}

export async function refreshTokens(options: {
  baseUrl: string;
  clientId: string;
  refreshToken: string;
}): Promise<HaTokens> {
  const payload = await postToken(options.baseUrl, {
    grant_type: "refresh_token",
    client_id: options.clientId,
    refresh_token: options.refreshToken,
  });

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || options.refreshToken,
    clientId: options.clientId,
    expires: expiresAt(payload.expires_in),
  };
}

export async function revokeTokens(options: {
  baseUrl: string;
  refreshToken: string;
}): Promise<void> {
  try {
    await fetch(`${normalizeBaseUrl(options.baseUrl)}${REVOKE_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody({ token: options.refreshToken }),
    });
  } catch {
    // Best-effort: a revoke that never lands must not block signing out.
  }
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

async function postToken(
  baseUrl: string,
  fields: Record<string, string>,
): Promise<TokenResponse> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TOKEN_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${normalizeBaseUrl(baseUrl)}${TOKEN_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody(fields),
      signal: abort.signal,
    });
  } catch (error) {
    throw new HaOAuthError(
      "unreachable",
      error instanceof Error ? error.message : "Token request failed",
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 400 || response.status === 403) {
    throw new HaOAuthError(
      "invalid-grant",
      `Home Assistant refused the grant (${response.status})`,
    );
  }
  if (!response.ok) {
    throw new HaOAuthError(
      "unknown",
      `Token request failed with ${response.status}`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new HaOAuthError("unknown", "Token response was not JSON");
  }

  if (!isTokenResponse(payload)) {
    throw new HaOAuthError("unknown", "Token response was missing fields");
  }
  return payload;
}

function isTokenResponse(value: unknown): value is TokenResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.access_token === "string" &&
    typeof candidate.expires_in === "number"
  );
}

function expiresAt(expiresIn: number): number {
  return Date.now() + Math.max(0, expiresIn - 60) * 1000;
}

function formBody(fields: Record<string, string>): string {
  return Object.entries(fields)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");
}
