import { buildAuthorizeUrl, exchangeCode, HaOAuthError, type HaTokens } from "@ethio/ha-sdk";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { trimTrailingSlash } from "@/lib/url";

/**
 * Baked into the client identifier documents Home Assistant fetches during
 * login. Changing it breaks every installed copy of the app.
 */
const REDIRECT_URI = "ethiohome://auth-callback";

const LOCAL_CLIENT_ID_PATH = "/local/ethio-home/auth.html";
const HOSTED_CLIENT_ID = "https://kiyosoft.github.io/home-project/app/";
const CLIENT_ID_PROBE_TIMEOUT_MS = 1500;

export type LoginFailure =
  | "cancelled"
  | "unreachable"
  | "rejected"
  | "no-client-id"
  | "unknown";

export type LoginResult =
  | { ok: true; tokens: HaTokens }
  | { ok: false; failure: LoginFailure };

export async function loginWithHomeAssistant(
  baseUrl: string,
): Promise<LoginResult> {
  const target = trimTrailingSlash(baseUrl);
  const clientId = await resolveClientId(target);
  if (!clientId) return { ok: false, failure: "no-client-id" };

  const state = Crypto.randomUUID();

  const authorizeUrl = buildAuthorizeUrl({
    baseUrl: target,
    clientId,
    redirectUri: REDIRECT_URI,
    state,
  });

  let session: WebBrowser.WebBrowserAuthSessionResult;
  try {
    session = await WebBrowser.openAuthSessionAsync(authorizeUrl, REDIRECT_URI);
  } catch {
    return { ok: false, failure: "unknown" };
  }

  if (session.type !== "success") {
    return { ok: false, failure: "cancelled" };
  }

  const { queryParams } = Linking.parse(session.url);
  const code = firstParam(queryParams?.code);
  if (!code || firstParam(queryParams?.state) !== state) {
    return { ok: false, failure: "unknown" };
  }

  try {
    return {
      ok: true,
      tokens: await exchangeCode({ baseUrl: target, clientId, code }),
    };
  } catch (error) {
    return { ok: false, failure: oauthFailure(error) };
  }
}

function oauthFailure(error: unknown): LoginFailure {
  if (error instanceof HaOAuthError) {
    if (error.kind === "invalid-grant") return "rejected";
    if (error.kind === "unreachable") return "unreachable";
  }
  return "unknown";
}

async function resolveClientId(baseUrl: string): Promise<string | null> {
  const candidates = [`${baseUrl}${LOCAL_CLIENT_ID_PATH}`, HOSTED_CLIENT_ID];

  for (const candidate of candidates) {
    if (await servesClientIdDocument(candidate)) return candidate;
  }
  return null;
}

async function servesClientIdDocument(url: string): Promise<boolean> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), CLIENT_ID_PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: abort.signal });
    if (!response.ok) return false;
    return (await response.text()).includes(REDIRECT_URI);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}
