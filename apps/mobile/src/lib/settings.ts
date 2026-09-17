import type { HaTokens } from "@ethio/ha-sdk";
import { getLocales } from "expo-localization";
import * as SecureStore from "expo-secure-store";

import { isLocale, type Locale } from "@/i18n";
import { kv } from "@/lib/kv-mmkv";
import {
  CONNECTION_KEY,
  DASHBOARD_KEY,
  ETHIOPIAN_HOURS_KEY,
  LOCALE_KEY,
  NOTIFICATIONS_KEY,
  THEME_KEY,
} from "@/lib/kv-keys";

/**
 * Tokens stay in SecureStore: it rejects ":" in keys, and credentials have no
 * business sitting next to the dashboard document.
 */
const TOKEN_KEY = "ethio-home.token.v1";
const TOKENS_KEY = "ethio-home.tokens.v1";

export type ConnectionMode = "live" | "demo";

export type AuthMode = "oauth" | "token";

export interface ConnectionProfile {
  internalUrl: string;
  externalUrl: string;
  prioritizeInternal: boolean;
  /** SSIDs, or `BSSID:1a:2b:..` entries as the companion app spells them. */
  homeNetworks: string[];
  /** Treat a wired or tunnelled connection as being at home, SSID unread. */
  ethernetIsHome: boolean;
  vpnIsHome: boolean;
  instanceName: string;
  instanceId: string;
}

export interface ConnectionSettings {
  mode: ConnectionMode;
  authMode: AuthMode;
  profile: ConnectionProfile;
  token: string;
  tokens: HaTokens | null;
}

export const defaultProfile: ConnectionProfile = {
  internalUrl: "",
  externalUrl: "",
  prioritizeInternal: false,
  homeNetworks: [],
  ethernetIsHome: false,
  vpnIsHome: false,
  instanceName: "",
  instanceId: "",
};

interface StoredConnection {
  mode: ConnectionMode;
  authMode: AuthMode;
  profile: ConnectionProfile;
}

export function loadStoredConnection(): StoredConnection | null {
  return parseStored(kv.getJson(CONNECTION_KEY));
}

export async function loadConnectionSettings(): Promise<ConnectionSettings | null> {
  const stored = loadStoredConnection();
  if (!stored) return null;
  return withCredentials(stored);
}

export async function saveConnectionSettings(
  settings: ConnectionSettings,
): Promise<void> {
  const stored: StoredConnection = {
    mode: settings.mode,
    authMode: settings.authMode,
    profile: settings.profile,
  };
  kv.setJson(CONNECTION_KEY, stored);

  if (settings.mode === "live" && settings.authMode === "token" && settings.token) {
    await SecureStore.setItemAsync(TOKEN_KEY, settings.token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }

  if (settings.mode === "live" && settings.authMode === "oauth" && settings.tokens) {
    await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(settings.tokens));
  } else {
    await SecureStore.deleteItemAsync(TOKENS_KEY);
  }
}

export async function saveTokens(tokens: HaTokens): Promise<void> {
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
}

export async function clearConnectionSettings(): Promise<void> {
  kv.remove(CONNECTION_KEY);
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(TOKENS_KEY);
}

async function withCredentials(
  stored: StoredConnection,
): Promise<ConnectionSettings> {
  if (stored.mode === "demo") {
    return {
      mode: "demo",
      authMode: "token",
      profile: defaultProfile,
      token: "",
      tokens: null,
    };
  }

  if (stored.authMode === "oauth") {
    return {
      ...stored,
      token: "",
      tokens: await readTokens(),
    };
  }

  return {
    ...stored,
    token: (await SecureStore.getItemAsync(TOKEN_KEY)) ?? "",
    tokens: null,
  };
}

async function readTokens(): Promise<HaTokens | null> {
  const raw = await SecureStore.getItemAsync(TOKENS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.clientId !== "string" ||
      typeof parsed.expires !== "number"
    ) {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      clientId: parsed.clientId,
      expires: parsed.expires,
    };
  } catch {
    return null;
  }
}

function parseStored(value: unknown): StoredConnection | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  const profile = candidate.profile;
  if (typeof profile !== "object" || profile === null) return null;
  const fields = profile as Record<string, unknown>;

  return {
    mode: candidate.mode === "demo" ? "demo" : "live",
    authMode: candidate.authMode === "oauth" ? "oauth" : "token",
    profile: {
      internalUrl: asString(fields.internalUrl),
      externalUrl: asString(fields.externalUrl),
      prioritizeInternal: fields.prioritizeInternal === true,
      homeNetworks: Array.isArray(fields.homeNetworks)
        ? fields.homeNetworks.filter(
            (entry): entry is string => typeof entry === "string",
          )
        : [],
      ethernetIsHome: fields.ethernetIsHome === true,
      vpnIsHome: fields.vpnIsHome === true,
      instanceName: asString(fields.instanceName),
      instanceId: asString(fields.instanceId),
    },
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Raw JSON; the caller validates it against the mobile dashboard schema. */
export function loadDashboardDocument(): unknown | null {
  return kv.getJson(DASHBOARD_KEY);
}

export function saveDashboardDocument(document: unknown): void {
  kv.setJson(DASHBOARD_KEY, document);
}

export function clearDashboardDocument(): void {
  kv.remove(DASHBOARD_KEY);
}

/** Raw JSON; the notification store validates the shape. */
export function loadNotificationHistory(): unknown | null {
  return kv.getJson(NOTIFICATIONS_KEY);
}

export function saveNotificationHistory(history: unknown): void {
  kv.setJson(NOTIFICATIONS_KEY, history);
}

export function clearNotificationHistory(): void {
  kv.remove(NOTIFICATIONS_KEY);
}

export function loadLocale(): Locale {
  const saved = kv.getString(LOCALE_KEY);
  if (isLocale(saved)) return saved;
  return getLocales()[0]?.languageCode === "am" ? "am" : "en";
}

export function saveLocale(locale: Locale): void {
  kv.setString(LOCALE_KEY, locale);
}

export function loadEthiopianHours(): boolean {
  return kv.getFlag(ETHIOPIAN_HOURS_KEY) === true;
}

export function saveEthiopianHours(enabled: boolean): void {
  kv.setFlag(ETHIOPIAN_HOURS_KEY, enabled);
}

export type ThemePreference = "light" | "dark" | "system";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function loadTheme(): ThemePreference {
  const saved = kv.getString(THEME_KEY);
  if (isThemePreference(saved)) return saved;
  return "system";
}

export function saveTheme(theme: ThemePreference): void {
  kv.setString(THEME_KEY, theme);
}
