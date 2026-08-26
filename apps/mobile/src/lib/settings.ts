import type { HaTokens } from "@ethio/ha-sdk";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import * as SecureStore from "expo-secure-store";

import { isLocale, type Locale } from "@/i18n";

/**
 * Key names match the web dashboard so a dashboard document copied between the
 * two stays recognisable. Tokens are the exception: SecureStore rejects ":" in
 * keys, and credentials have no business sitting in AsyncStorage anyway.
 */
const CONNECTION_V1_KEY = "ethio-home.connection:v1";
const CONNECTION_KEY = "ethio-home.connection:v2";
const LOCALE_KEY = "ethio-home.locale";
const THEME_KEY = "ethio-home.theme";
const TOKEN_KEY = "ethio-home.token.v1";
const TOKENS_KEY = "ethio-home.tokens.v1";
const DASHBOARD_KEY = "ethio-home.mobile-dashboard:v1";

export type ConnectionMode = "live" | "demo";

export type AuthMode = "oauth" | "token";

export interface ConnectionProfile {
  internalUrl: string;
  externalUrl: string;
  prioritizeInternal: boolean;
  /** SSIDs, or `BSSID:1a:2b:..` entries as the companion app spells them. */
  homeNetworks: string[];
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
  instanceName: "",
  instanceId: "",
};

interface StoredConnection {
  mode: ConnectionMode;
  authMode: AuthMode;
  profile: ConnectionProfile;
}

export async function loadConnectionSettings(): Promise<ConnectionSettings | null> {
  try {
    const raw = await AsyncStorage.getItem(CONNECTION_KEY);
    if (!raw) return migrateV1();

    const stored = parseStored(JSON.parse(raw) as unknown);
    if (!stored) return null;
    return withCredentials(stored);
  } catch {
    return null;
  }
}

export async function saveConnectionSettings(
  settings: ConnectionSettings,
): Promise<void> {
  const stored: StoredConnection = {
    mode: settings.mode,
    authMode: settings.authMode,
    profile: settings.profile,
  };
  await AsyncStorage.setItem(CONNECTION_KEY, JSON.stringify(stored));

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
  await AsyncStorage.multiRemove([CONNECTION_KEY, CONNECTION_V1_KEY]);
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(TOKENS_KEY);
}

async function migrateV1(): Promise<ConnectionSettings | null> {
  const raw = await AsyncStorage.getItem(CONNECTION_V1_KEY);
  if (!raw) return null;

  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const stored: StoredConnection = {
    mode: parsed.mode === "demo" ? "demo" : "live",
    authMode: "token",
    profile: {
      ...defaultProfile,
      externalUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : "",
    },
  };

  await AsyncStorage.setItem(CONNECTION_KEY, JSON.stringify(stored));
  await AsyncStorage.removeItem(CONNECTION_V1_KEY);
  return withCredentials(stored);
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
      instanceName: asString(fields.instanceName),
      instanceId: asString(fields.instanceId),
    },
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Raw JSON; the caller validates it against the mobile dashboard schema. */
export async function loadDashboardDocument(): Promise<unknown | null> {
  try {
    const raw = await AsyncStorage.getItem(DASHBOARD_KEY);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export async function saveDashboardDocument(document: unknown): Promise<void> {
  await AsyncStorage.setItem(DASHBOARD_KEY, JSON.stringify(document));
}

export async function clearDashboardDocument(): Promise<void> {
  await AsyncStorage.removeItem(DASHBOARD_KEY);
}

export async function loadLocale(): Promise<Locale> {
  const saved = await AsyncStorage.getItem(LOCALE_KEY);
  if (isLocale(saved)) return saved;
  return getLocales()[0]?.languageCode === "am" ? "am" : "en";
}

export async function saveLocale(locale: Locale): Promise<void> {
  await AsyncStorage.setItem(LOCALE_KEY, locale);
}

export type ThemePreference = "light" | "dark" | "system";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export async function loadTheme(): Promise<ThemePreference> {
  try {
    const saved = await AsyncStorage.getItem(THEME_KEY);
    if (isThemePreference(saved)) return saved;
  } catch {
    // Same fallback as a missing key: follow the phone until the user picks.
  }
  return "system";
}

export async function saveTheme(theme: ThemePreference): Promise<void> {
  await AsyncStorage.setItem(THEME_KEY, theme);
}
