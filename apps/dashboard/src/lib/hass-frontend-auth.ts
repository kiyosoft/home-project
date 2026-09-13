import type { HaTokens } from "@ethio/ha-sdk";

import { isEmbeddedHassWindow } from "@/lib/hass-parent-kiosk";

export type HassFrontendGrant =
  | { kind: "oauth"; tokens: HaTokens }
  | { kind: "token"; token: string };

interface HassAuthData {
  hassUrl?: unknown;
  clientId?: unknown;
  access_token?: unknown;
  refresh_token?: unknown;
  expires?: unknown;
}

interface ParentTokenCache {
  __tokenCache?: { tokens?: unknown; writeEnabled?: boolean };
}

export function parseHassFrontendAuth(
  data: unknown,
  origin: string,
): HassFrontendGrant | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as HassAuthData;
  if (typeof raw.access_token !== "string" || !raw.access_token) return null;
  if (typeof raw.refresh_token === "string" && raw.refresh_token) {
    return {
      kind: "oauth",
      tokens: {
        accessToken: raw.access_token,
        refreshToken: raw.refresh_token,
        clientId:
          typeof raw.clientId === "string" && raw.clientId
            ? raw.clientId
            : `${origin}/`,
        expires:
          typeof raw.expires === "number"
            ? raw.expires
            : Date.now() + 1_800_000,
      },
    };
  }
  return { kind: "token", token: raw.access_token };
}

function readParentTokens(): unknown {
  if (!isEmbeddedHassWindow(window, window.parent)) return null;
  try {
    return (window.parent as Window & ParentTokenCache).__tokenCache?.tokens ??
      null;
  } catch {
    return null;
  }
}

export function loadHassFrontendAuth(
  origin = window.location.origin,
): HassFrontendGrant | null {
  const fromParent = parseHassFrontendAuth(readParentTokens(), origin);
  if (fromParent) return fromParent;
  try {
    const raw = localStorage.getItem("hassTokens");
    if (!raw) return null;
    return parseHassFrontendAuth(JSON.parse(raw), origin);
  } catch {
    return null;
  }
}

export function saveHassFrontendAuth(tokens: HaTokens): void {
  const data = {
    hassUrl: window.location.origin,
    clientId: tokens.clientId,
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires: tokens.expires,
    expires_in: Math.max(0, Math.round((tokens.expires - Date.now()) / 1000)),
    token_type: "Bearer",
  };
  try {
    localStorage.setItem("hassTokens", JSON.stringify(data));
  } catch {
    /* private mode */
  }
  if (!isEmbeddedHassWindow(window, window.parent)) return;
  try {
    const parent = window.parent as Window & ParentTokenCache;
    parent.__tokenCache = parent.__tokenCache ?? {};
    parent.__tokenCache.tokens = data;
    parent.__tokenCache.writeEnabled = true;
  } catch {
    /* ignore */
  }
}
