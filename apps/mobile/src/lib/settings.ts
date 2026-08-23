import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import * as SecureStore from "expo-secure-store";

import { isLocale, type Locale } from "@/i18n";

/**
 * Key names match the web dashboard so a dashboard document copied between the
 * two stays recognisable. The token is the one exception: SecureStore rejects
 * ":" in keys, and a long-lived access token has no business sitting in
 * AsyncStorage anyway.
 */
const CONNECTION_KEY = "ethio-home.connection:v1";
const LOCALE_KEY = "ethio-home.locale";
const TOKEN_KEY = "ethio-home.token.v1";
const DASHBOARD_KEY = "ethio-home.mobile-dashboard:v1";

export type ConnectionMode = "live" | "demo";

export interface ConnectionSettings {
  mode: ConnectionMode;
  baseUrl: string;
  token: string;
}

export const defaultConnection: ConnectionSettings = {
  mode: "live",
  baseUrl: "",
  token: "",
};

interface StoredConnection {
  mode: ConnectionMode;
  baseUrl: string;
}

export async function loadConnectionSettings(): Promise<ConnectionSettings | null> {
  try {
    const raw = await AsyncStorage.getItem(CONNECTION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredConnection>;
    const mode = parsed.mode === "demo" ? "demo" : "live";
    const baseUrl = typeof parsed.baseUrl === "string" ? parsed.baseUrl : "";

    if (mode === "demo") {
      return { mode, baseUrl: "", token: "" };
    }

    const token = (await SecureStore.getItemAsync(TOKEN_KEY)) ?? "";
    return { mode, baseUrl, token };
  } catch {
    return null;
  }
}

export async function saveConnectionSettings(
  settings: ConnectionSettings,
): Promise<void> {
  const stored: StoredConnection = {
    mode: settings.mode,
    baseUrl: settings.baseUrl,
  };
  await AsyncStorage.setItem(CONNECTION_KEY, JSON.stringify(stored));

  if (settings.mode === "live" && settings.token) {
    await SecureStore.setItemAsync(TOKEN_KEY, settings.token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export async function clearConnectionSettings(): Promise<void> {
  await AsyncStorage.removeItem(CONNECTION_KEY);
  await SecureStore.deleteItemAsync(TOKEN_KEY);
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
