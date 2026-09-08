/**
 * Must load at process start, before any geofence is registered. Expo's task
 * manager looks this up by name when iOS/Android launches JS for a zone event.
 */
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import {
  LOCATION_GEOFENCE_TASK,
  LOCATION_TRIGGER,
  reportDeviceLocation,
} from "@/lib/location-report";
import { noteHomePresence } from "@/watch/at-home";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

TaskManager.defineTask(LOCATION_GEOFENCE_TASK, async ({ data, error }) => {
  if (error || !isRecord(data)) return;

  const eventType = data.eventType;
  const trigger =
    eventType === Location.GeofencingEventType.Exit
      ? LOCATION_TRIGGER.zoneExit
      : LOCATION_TRIGGER.zoneEnter;

  const current = await Location.getLastKnownPositionAsync();
  const coords = current?.coords;
  const region = isRecord(data.region) ? data.region : undefined;
  const identifier =
    typeof region?.identifier === "string" ? region.identifier : "";
  if (identifier === "zone.home") {
    await noteHomePresence(eventType !== Location.GeofencingEventType.Exit);
  }
  const latitude = coords?.latitude ?? num(region?.latitude);
  const longitude = coords?.longitude ?? num(region?.longitude);
  if (latitude === undefined || longitude === undefined) return;

  await reportDeviceLocation({
    trigger,
    update: {
      gps: [latitude, longitude],
      gpsAccuracy:
        coords?.accuracy !== undefined && coords.accuracy !== null
          ? Math.round(coords.accuracy)
          : undefined,
      altitude:
        coords?.altitude !== undefined && coords.altitude !== null
          ? coords.altitude
          : undefined,
      speed:
        coords?.speed !== undefined && coords.speed !== null
          ? coords.speed
          : undefined,
      course:
        coords?.heading !== undefined && coords.heading !== null
          ? coords.heading
          : undefined,
    },
  });
});
