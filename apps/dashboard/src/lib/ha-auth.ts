import {
  normalizeBaseUrl,
  signInWithPassword as requestPasswordSignIn,
  submitMfaCode,
  type HaTokens,
  type LoginFailure as FlowFailure,
  type MfaLogin,
  type PasswordLogin,
} from "@ethio/ha-sdk";

/**
 * Home Assistant sign-in, driven from our own form.
 *
 * The login API itself lives in `@ethio/ha-sdk`. Home Assistant deliberately
 * refuses cross-origin calls to `/auth/login_flow` so that no third-party page
 * can collect its passwords, and no `cors_allowed_origins` entry changes that.
 * Sign-in therefore works when the dashboard is served by Home Assistant
 * itself — the add-on — and callers fall back to a long-lived access token
 * anywhere else.
 */

export type LoginFailure = FlowFailure | "not-same-origin";

export type LoginStep =
  | { kind: "tokens"; tokens: HaTokens }
  | { kind: "mfa"; flowId: string }
  | { kind: "failure"; failure: LoginFailure };

export type { MfaLogin, PasswordLogin };
export { submitMfaCode };

export async function signInWithPassword(
  options: PasswordLogin,
): Promise<LoginStep> {
  const baseUrl = normalizeBaseUrl(options.baseUrl.trim());
  const origin = originOf(baseUrl);
  if (!origin) {
    return { kind: "failure", failure: "unreachable" };
  }
  if (origin !== window.location.origin) {
    return { kind: "failure", failure: "not-same-origin" };
  }
  return requestPasswordSignIn(options);
}

function originOf(url: string): string | null {
  try {
    return new URL(url.trim()).origin;
  } catch {
    return null;
  }
}
