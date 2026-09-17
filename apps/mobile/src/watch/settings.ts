import { kv } from "@/lib/kv-mmkv";
import {
  WATCH_AREA_KEY,
  WATCH_AT_HOME_KEY,
  WATCH_ENTITIES_KEY,
} from "@/lib/kv-keys";

export function loadWatchEntityIds(): string[] | null {
  const parsed = kv.getJson(WATCH_ENTITIES_KEY);
  if (!Array.isArray(parsed)) return null;
  return parsed.filter((entry): entry is string => typeof entry === "string");
}

export function saveWatchEntityIds(ids: string[]): void {
  kv.setJson(WATCH_ENTITIES_KEY, ids);
}

export function loadWatchAreaId(): string {
  return kv.getString(WATCH_AREA_KEY) ?? "";
}

export function saveWatchAreaId(areaId: string): void {
  kv.setString(WATCH_AREA_KEY, areaId);
}

export function loadAtHome(): boolean | null {
  return kv.getFlag(WATCH_AT_HOME_KEY);
}

export function saveAtHome(atHome: boolean): void {
  kv.setFlag(WATCH_AT_HOME_KEY, atHome);
}
