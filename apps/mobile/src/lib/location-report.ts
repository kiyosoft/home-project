import {
  lastUpdateTriggerSensor,
  LOCATION_TRIGGER,
  registerSensor,
  updateLocation,
  updateSensorStates,
  type LocationTrigger,
  type LocationUpdate,
} from "@ethio/ha-sdk";
import * as SecureStore from "expo-secure-store";

export const LOCATION_GEOFENCE_TASK = "ethio-home.zone-geofence";

const TARGETS_KEY = "ethio-home.location-targets.v1";

export interface LocationTargets {
  webhookId: string;
  urls: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function saveLocationTargets(
  targets: LocationTargets,
): Promise<void> {
  await SecureStore.setItemAsync(TARGETS_KEY, JSON.stringify(targets));
}

export async function clearLocationTargets(): Promise<void> {
  await SecureStore.deleteItemAsync(TARGETS_KEY);
}

export async function loadLocationTargets(): Promise<LocationTargets | null> {
  try {
    const raw = await SecureStore.getItemAsync(TARGETS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const webhookId =
      typeof parsed.webhookId === "string" ? parsed.webhookId : "";
    const urls = Array.isArray(parsed.urls)
      ? parsed.urls.filter(
          (url): url is string => typeof url === "string" && Boolean(url),
        )
      : [];
    if (!webhookId || urls.length === 0) return null;
    return { webhookId, urls };
  } catch {
    return null;
  }
}

async function postToTargets(
  send: (baseUrl: string, webhookId: string) => Promise<void>,
): Promise<boolean> {
  const targets = await loadLocationTargets();
  if (!targets) return false;
  for (const baseUrl of targets.urls) {
    try {
      await send(baseUrl, targets.webhookId);
      return true;
    } catch {
      // Try the next address; the phone may have moved between networks.
    }
  }
  return false;
}

export async function reportDeviceLocation(options: {
  trigger: LocationTrigger;
  update: LocationUpdate;
}): Promise<boolean> {
  const sent = await postToTargets((baseUrl, webhookId) =>
    updateLocation({ baseUrl, webhookId, update: options.update }),
  );
  if (!sent) return false;
  const sensor = lastUpdateTriggerSensor(options.trigger);
  await postToTargets(async (baseUrl, webhookId) => {
    try {
      await updateSensorStates({
        baseUrl,
        webhookId,
        sensors: [sensor],
      });
    } catch {
      await registerSensor({ baseUrl, webhookId, sensor });
      await updateSensorStates({
        baseUrl,
        webhookId,
        sensors: [sensor],
      });
    }
  });
  return true;
}

export async function ensureLastUpdateTriggerSensor(): Promise<void> {
  const sensor = lastUpdateTriggerSensor(LOCATION_TRIGGER.appOpen);
  await postToTargets(async (baseUrl, webhookId) => {
    await registerSensor({ baseUrl, webhookId, sensor });
  });
}

export { LOCATION_TRIGGER };
