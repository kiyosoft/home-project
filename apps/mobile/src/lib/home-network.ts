import * as Location from "expo-location";

import NetInfo from "@/lib/netinfo";
import type { ConnectionProfile } from "@/lib/settings";

/**
 * SSID matching, the way the Home Assistant companion app chooses between
 * internal and external. "unknown" means the OS would not name the network
 * (no permission, not Wi-Fi, or a hidden SSID) — callers probe the address
 * instead of treating that as away.
 */
export type HomeNetworkVerdict = "home" | "away" | "unknown";

const BSSID_PREFIX = "bssid:";

type HomeNetworkSettings = Pick<
  ConnectionProfile,
  "homeNetworks" | "ethernetIsHome" | "vpnIsHome"
>;

export async function readHomeNetworkVerdict(
  settings: HomeNetworkSettings,
): Promise<HomeNetworkVerdict> {
  const active = await NetInfo.fetch();
  if (!active.isConnected) return "away";

  if (settings.ethernetIsHome && active.type === "ethernet") return "home";
  if (settings.vpnIsHome && active.type === "vpn") return "home";

  if (settings.homeNetworks.length === 0) return "unknown";

  // Being associated with home Wi-Fi is not enough: a phone that routes data
  // over cellular anyway cannot reach the internal address.
  if (active.type !== "wifi") return "away";

  const wifi = await NetInfo.fetch("wifi");
  if (wifi.type !== "wifi") return "unknown";

  const ssid = normalize(wifi.details?.ssid);
  const bssid = normalize(wifi.details?.bssid);
  if (!ssid && !bssid) return "unknown";

  for (const entry of settings.homeNetworks) {
    const wanted = normalize(entry);
    if (!wanted) continue;

    if (wanted.startsWith(BSSID_PREFIX)) {
      if (bssid && bssid === wanted.slice(BSSID_PREFIX.length)) return "home";
      continue;
    }
    if (ssid && ssid === wanted) return "home";
  }

  return "away";
}

export async function ensureSsidPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Location.requestForegroundPermissionsAsync()).granted;
}

export async function hasSsidPermission(): Promise<boolean> {
  return (await Location.getForegroundPermissionsAsync()).granted;
}

export async function currentSsid(): Promise<string | null> {
  const state = await NetInfo.fetch("wifi");
  if (state.type !== "wifi") return null;
  const ssid = state.details?.ssid;
  return typeof ssid === "string" && ssid ? ssid : null;
}

function normalize(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === "<unknown ssid>") return null;
  return trimmed;
}
