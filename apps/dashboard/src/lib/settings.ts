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
export type { ThemeMode, Locale };

export interface ConnectionSettings {
  mode: ConnectionMode;
  baseUrl: string;
  token: string;
}

export interface LockSettings {
  pinHash: string | null;
  kiosk: boolean;
}

const CONNECTION_KEY = "ethio-home.connection";
const THEME_KEY = "ethio-home.theme";
const LOCALE_KEY = "ethio-home.locale";
const DASHBOARD_KEY = "ethio-home.dashboard";
const LOCK_KEY = "ethio-home.lock";

const defaultConnection: ConnectionSettings = {
  mode: "live",
  baseUrl: "",
  token: "",
};

export function loadConnectionSettings(): ConnectionSettings | null {
  try {
    const raw = localStorage.getItem(CONNECTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConnectionSettings>;
    if (parsed.mode !== "live" && parsed.mode !== "demo") return null;
    return {
      mode: parsed.mode,
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : "",
      token: typeof parsed.token === "string" ? parsed.token : "",
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
      baseUrl: settings.baseUrl,
      token: settings.token,
    }),
  );
}

export function clearConnectionSettings(): void {
  localStorage.removeItem(CONNECTION_KEY);
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
    const raw = localStorage.getItem(DASHBOARD_KEY);
    if (!raw) return null;
    const parsed = safeParseDashboardConfig(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveDashboard(dashboard: DashboardConfig): void {
  localStorage.setItem(DASHBOARD_KEY, JSON.stringify(dashboard));
}

export function loadLockSettings(): LockSettings {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
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
}

export { defaultConnection };
