import AsyncStorage from "@react-native-async-storage/async-storage";

const ENTITIES_KEY = "ethio-home.watch-entities:v1";
const AREA_KEY = "ethio-home.watch-area:v1";
const AT_HOME_KEY = "ethio-home.watch-at-home:v1";

export async function loadWatchEntityIds(): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(ENTITIES_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return null;
  }
}

export async function saveWatchEntityIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(ENTITIES_KEY, JSON.stringify(ids));
}

export async function loadWatchAreaId(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(AREA_KEY)) ?? "";
  } catch {
    return "";
  }
}

export async function saveWatchAreaId(areaId: string): Promise<void> {
  await AsyncStorage.setItem(AREA_KEY, areaId);
}

export async function loadAtHome(): Promise<boolean | null> {
  try {
    const raw = await AsyncStorage.getItem(AT_HOME_KEY);
    if (raw === "0") return false;
    if (raw === "1") return true;
    return null;
  } catch {
    return null;
  }
}

export async function saveAtHome(atHome: boolean): Promise<void> {
  await AsyncStorage.setItem(AT_HOME_KEY, atHome ? "1" : "0");
}
