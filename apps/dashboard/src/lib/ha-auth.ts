import {
  exchangeCode,
  HaOAuthError,
  normalizeBaseUrl,
  type HaTokens,
} from "@ethio/ha-sdk";

/**
 * Home Assistant sign-in, driven from our own form.
 *
 * `/auth/login_flow` is the API behind Home Assistant's own login page: it
 * takes a username and password and hands back an authorization code, which
 * `/auth/token` turns into the same refreshable grant the mobile app gets.
 * Nothing is redirected and nothing has to be published on the instance —
 * `redirect_uri` is only validated, never navigated to, so pointing both it
 * and `client_id` at the hub's own origin satisfies IndieAuth outright
 * (homeassistant/components/auth/indieauth.py, verify_redirect_uri).
 *
 * Home Assistant deliberately refuses cross-origin calls to `/auth/login_flow`
 * so that no third-party page can collect its passwords, and no
 * `cors_allowed_origins` entry changes that. Sign-in therefore works when the
 * dashboard is served by Home Assistant itself — the add-on — and callers fall
 * back to a long-lived access token anywhere else.
 */

const LOGIN_FLOW_PATH = "/auth/login_flow";

/** Username and password, as opposed to trusted networks or a command line. */
const AUTH_PROVIDER: [string, null] = ["homeassistant", null];

export type LoginFailure =
  | "invalid-auth"
  | "invalid-code"
  | "unreachable"
  | "not-same-origin"
  | "blocked"
  | "unknown";

export type LoginStep =
  | { kind: "tokens"; tokens: HaTokens }
  /** Password accepted; Home Assistant wants a second factor. */
  | { kind: "mfa"; flowId: string }
  | { kind: "failure"; failure: LoginFailure };

export interface PasswordLogin {
  baseUrl: string;
  username: string;
  password: string;
}

export interface MfaLogin {
  baseUrl: string;
  flowId: string;
  code: string;
}

export async function signInWithPassword(
  options: PasswordLogin,
): Promise<LoginStep> {
  const baseUrl = normalizeBaseUrl(options.baseUrl.trim());
  const clientId = clientIdFor(baseUrl);
  if (!clientId) return { kind: "failure", failure: "unreachable" };
  if (originOf(baseUrl) !== window.location.origin) {
    return { kind: "failure", failure: "not-same-origin" };
  }

  const started = await postJson(`${baseUrl}${LOGIN_FLOW_PATH}`, {
    client_id: clientId,
    handler: AUTH_PROVIDER,
    redirect_uri: clientId,
  });
  if (started.kind === "failure") return started;

  const flowId = stringField(started.body, "flow_id");
  if (!flowId) return { kind: "failure", failure: "unknown" };

  return submitStep(baseUrl, clientId, flowId, {
    username: options.username,
    password: options.password,
  });
}

export async function submitMfaCode(options: MfaLogin): Promise<LoginStep> {
  const baseUrl = normalizeBaseUrl(options.baseUrl.trim());
  const clientId = clientIdFor(baseUrl);
  if (!clientId) return { kind: "failure", failure: "unreachable" };

  return submitStep(baseUrl, clientId, options.flowId, { code: options.code });
}

async function submitStep(
  baseUrl: string,
  clientId: string,
  flowId: string,
  fields: Record<string, string>,
): Promise<LoginStep> {
  const stepped = await postJson(`${baseUrl}${LOGIN_FLOW_PATH}/${flowId}`, {
    client_id: clientId,
    ...fields,
  });
  if (stepped.kind === "failure") return stepped;
  return readStep(stepped.body, baseUrl, clientId);
}

async function readStep(
  body: unknown,
  baseUrl: string,
  clientId: string,
): Promise<LoginStep> {
  const type = stringField(body, "type");

  if (type === "create_entry") {
    const code = stringField(body, "result");
    if (!code) return { kind: "failure", failure: "unknown" };
    try {
      const tokens = await exchangeCode({ baseUrl, clientId, code });
      return { kind: "tokens", tokens };
    } catch (error) {
      return { kind: "failure", failure: exchangeFailure(error) };
    }
  }

  if (type !== "form") return { kind: "failure", failure: "unknown" };

  // A rejected password comes back as the same form with an error on it
  // rather than as an HTTP error.
  const baseError = errorField(body);
  if (baseError === "invalid_auth") {
    return { kind: "failure", failure: "invalid-auth" };
  }
  if (baseError === "invalid_code") {
    return { kind: "failure", failure: "invalid-code" };
  }

  const flowId = stringField(body, "flow_id");
  if (stringField(body, "step_id") === "mfa" && flowId) {
    return { kind: "mfa", flowId };
  }
  return { kind: "failure", failure: baseError ? "invalid-auth" : "unknown" };
}

type PostResult =
  | { kind: "ok"; body: unknown }
  | { kind: "failure"; failure: LoginFailure };

async function postJson(
  url: string,
  payload: Record<string, unknown>,
): Promise<PostResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Also where a blocked cross-origin request lands, since the browser
    // reports it as an ordinary network failure.
    return { kind: "failure", failure: "unreachable" };
  }

  if (response.status === 403) {
    // Too many wrong passwords, or an account that may not log in here.
    return { kind: "failure", failure: "blocked" };
  }
  if (!response.ok) return { kind: "failure", failure: "unknown" };

  try {
    return { kind: "ok", body: await response.json() };
  } catch {
    return { kind: "failure", failure: "unknown" };
  }
}

function exchangeFailure(error: unknown): LoginFailure {
  if (error instanceof HaOAuthError) {
    if (error.kind === "invalid-grant") return "invalid-auth";
    if (error.kind === "unreachable") return "unreachable";
  }
  return "unknown";
}

/**
 * Home Assistant identifies clients by URL. The hub's own origin always passes
 * the same-host check against itself, and stays stable across ingress sessions
 * so the instance does not collect a refresh token per visit.
 */
function clientIdFor(baseUrl: string): string | null {
  const origin = originOf(baseUrl);
  return origin ? `${origin}/` : null;
}

function originOf(url: string): string | null {
  try {
    return new URL(url.trim()).origin;
  } catch {
    return null;
  }
}

function stringField(body: unknown, key: string): string | null {
  if (typeof body !== "object" || body === null) return null;
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" && value ? value : null;
}

function errorField(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const errors = (body as Record<string, unknown>).errors;
  if (typeof errors !== "object" || errors === null) return null;
  const base = (errors as Record<string, unknown>).base;
  return typeof base === "string" ? base : null;
}
