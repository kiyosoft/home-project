import type { HassEntities } from "@ethio/ha-sdk";
import type { LocationRegion } from "expo-location";

const DEFAULT_HOME_RADIUS_M = 100;

function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function zonesFromEntities(entities: HassEntities): LocationRegion[] {
  const zones: LocationRegion[] = [];
  for (const [entityId, entity] of Object.entries(entities)) {
    if (!entityId.startsWith("zone.")) continue;
    const latitude = num(entity.attributes.latitude);
    const longitude = num(entity.attributes.longitude);
    const radius = num(entity.attributes.radius) ?? DEFAULT_HOME_RADIUS_M;
    if (latitude === undefined || longitude === undefined) continue;
    if (radius <= 0) continue;
    zones.push({
      identifier: entityId,
      latitude,
      longitude,
      radius,
      notifyOnEnter: true,
      notifyOnExit: true,
    });
  }
  return zones;
}

export function homeZoneFromConfig(options: {
  latitude?: number;
  longitude?: number;
}): LocationRegion | null {
  const { latitude, longitude } = options;
  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }
  return {
    identifier: "zone.home",
    latitude,
    longitude,
    radius: DEFAULT_HOME_RADIUS_M,
    notifyOnEnter: true,
    notifyOnExit: true,
  };
}
