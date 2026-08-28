import type { HaTokens } from "@ethio/ha-sdk";

import {
  safeParseDashboardConfig,
} from "@/dashboard/schemas";
import type { DashboardConfig } from "@/dashboard/types";
import { isLocale, type Locale } from "@/i18n/locales";
import {
  isLightTheme,
  isThemeMode,
  type ThemeMode,
} from "@/lib/themes";

export type ConnectionMode = "live" | "demo";
export type AuthMode = "oauth" | "token";
export type { ThemeMode, Locale };

export interface ConnectionSettings {
  mode: ConnectionMode;
  authMode: AuthMode;
  baseUrl: string;
  /** Long-lived access token. Empty when `authMode` is `oauth`. */
  token: string;
  /** Refreshable grant. Null when `authMode` is `token`. */
  tokens: HaTokens | null;
}

export interface LockSettings {
  pinHash: string | null;
  kiosk: boolean;
}

const CONNECTION_KEY = "ethio-home.connection:v1";
const CONNECTION_KEY_LEGACY = "ethio-home.connection";
const THEME_KEY = "ethio-home.theme";
const LOCALE_KEY = "ethio-home.locale";
const DASHBOARD_KEY = "ethio-home.dashboard:v1";
const DASHBOARD_KEY_LEGACY = "ethio-home.dashboard";
const LOCK_KEY = "ethio-home.lock:v1";
const LOCK_KEY_LEGACY = "ethio-home.lock";

const defaultConnection: ConnectionSettings = {
  mode: "live",
  authMode: "token",
  baseUrl: "",
  token: "",
  tokens: null,
};

function readStorage(key: string, legacyKey: string): string | null {
  const current = localStorage.getItem(key);
  if (current != null) return current;
  const legacy = localStorage.getItem(legacyKey);
  if (legacy == null) return null;
  localStorage.setItem(key, legacy);
  localStorage.removeItem(legacyKey);
  return legacy;
}

export function loadConnectionSettings(): ConnectionSettings | null {
  try {
    const raw = readStorage(CONNECTION_KEY, CONNECTION_KEY_LEGACY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConnectionSettings>;
    if (parsed.mode !== "live" && parsed.mode !== "demo") return null;
    // Anything saved before sign-in existed is a long-lived token.
    const authMode: AuthMode = parsed.authMode === "oauth" ? "oauth" : "token";
    const tokens = authMode === "oauth" ? parseTokens(parsed.tokens) : null;
    return {
      mode: parsed.mode,
      authMode,
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : "",
      token: authMode === "token" && typeof parsed.token === "string" ? parsed.token : "",
      tokens,
    };
  } catch {
    return null;
  }
}

export function saveConnectionSettings(settings: ConnectionSettings): void {
  localStorage.setItem(
    CONNECTION_KEY,
    JSON.stringify({
      mode: settings.mode,
      authMode: settings.authMode,
      baseUrl: settings.baseUrl,
      token: settings.authMode === "token" ? settings.token : "",
      tokens: settings.authMode === "oauth" ? settings.tokens : null,
    }),
  );
  localStorage.removeItem(CONNECTION_KEY_LEGACY);
}

function parseTokens(value: unknown): HaTokens | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.accessToken !== "string" ||
    typeof candidate.refreshToken !== "string" ||
    typeof candidate.clientId !== "string" ||
    typeof candidate.expires !== "number"
  ) {
    return null;
  }
  return {
    accessToken: candidate.accessToken,
    refreshToken: candidate.refreshToken,
    clientId: candidate.clientId,
    expires: candidate.expires,
  };
}

export function clearConnectionSettings(): void {
  localStorage.removeItem(CONNECTION_KEY);
  localStorage.removeItem(CONNECTION_KEY_LEGACY);
}

/** Persists a rotated grant. Ignored once the connection is gone or not OAuth. */
export function saveConnectionTokens(tokens: HaTokens): void {
  const settings = loadConnectionSettings();
  if (!settings || settings.authMode !== "oauth") return;
  saveConnectionSettings({ ...settings, tokens });
}

/**
 * The bearer token for media and REST URLs. OAuth access tokens rotate, so
 * this reads storage rather than caching.
 */
export function liveAccessToken(): string {
  const saved = loadConnectionSettings();
  if (!saved || saved.mode !== "live") return "";
  return saved.authMode === "oauth"
    ? (saved.tokens?.accessToken ?? "")
    : saved.token;
}

export function loadTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);
  if (isThemeMode(stored)) return stored;
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

export function saveTheme(theme: ThemeMode): void {
  localStorage.setItem(THEME_KEY, theme);
}

export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", !isLightTheme(theme));
}

export function loadLocale(): Locale {
  const stored = localStorage.getItem(LOCALE_KEY);
  if (isLocale(stored)) return stored;
  if (
    typeof navigator !== "undefined" &&
    navigator.language.toLowerCase().startsWith("am")
  ) {
    return "am";
  }
  return "en";
}

export function saveLocale(locale: Locale): void {
  localStorage.setItem(LOCALE_KEY, locale);
}

export function applyLocale(locale: Locale): void {
  document.documentElement.lang = locale;
}

export function loadDashboard(): DashboardConfig | null {
  try {
    const raw = readStorage(DASHBOARD_KEY, DASHBOARD_KEY_LEGACY);
    if (!raw) return null;
    const parsed = safeParseDashboardConfig(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveDashboard(dashboard: DashboardConfig): void {
  localStorage.setItem(DASHBOARD_KEY, JSON.stringify(dashboard));
  localStorage.removeItem(DASHBOARD_KEY_LEGACY);
}

export function loadLockSettings(): LockSettings {
  try {
    const raw = readStorage(LOCK_KEY, LOCK_KEY_LEGACY);
    if (!raw) return { pinHash: null, kiosk: false };
    const parsed = JSON.parse(raw) as Partial<LockSettings>;
    return {
      pinHash: typeof parsed.pinHash === "string" ? parsed.pinHash : null,
      kiosk: Boolean(parsed.kiosk),
    };
  } catch {
    return { pinHash: null, kiosk: false };
  }
}

export function saveLockSettings(settings: LockSettings): void {
  localStorage.setItem(LOCK_KEY, JSON.stringify(settings));
  localStorage.removeItem(LOCK_KEY_LEGACY);
}

export { defaultConnection };
