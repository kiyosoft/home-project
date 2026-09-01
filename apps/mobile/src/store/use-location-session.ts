import {
  getHassConfig,
  LOCATION_TRIGGER,
  type HassEntities,
} from "@ethio/ha-sdk";
import * as Location from "expo-location";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import {
  ensureLastUpdateTriggerSensor,
  LOCATION_GEOFENCE_TASK,
  reportDeviceLocation,
  saveLocationTargets,
} from "@/lib/location-report";
import { homeZoneFromConfig, zonesFromEntities } from "@/lib/location-zones";
import { orderedCandidates } from "@/lib/select-url";
import { useHaStore } from "@/store/ha-store";

async function webhookUrls(): Promise<string[]> {
  const { activeUrl, profile } = useHaStore.getState();
  const candidates = await orderedCandidates(profile);
  const urls = [activeUrl, ...candidates.map((entry) => entry.url)];
  return [...new Set(urls.filter(Boolean))];
}

async function ensureLocationPermission(): Promise<boolean> {
  const foreground = await Location.getForegroundPermissionsAsync();
  let granted = foreground.granted;
  if (!granted && foreground.canAskAgain) {
    granted = (await Location.requestForegroundPermissionsAsync()).granted;
  }
  if (!granted) return false;

  const background = await Location.getBackgroundPermissionsAsync();
  if (!background.granted && background.canAskAgain) {
    await Location.requestBackgroundPermissionsAsync();
  }
  return true;
}

async function syncGeofences(entities: HassEntities): Promise<void> {
  const background = await Location.getBackgroundPermissionsAsync();
  if (!background.granted) return;

  let regions = zonesFromEntities(entities);
  if (regions.length === 0) {
    try {
      const config = await getHassConfig((message) =>
        useHaStore.getState().sendMessagePromise(message),
      );
      const home = homeZoneFromConfig(config);
      if (home) regions = [home];
    } catch {
      return;
    }
  }
  if (regions.length === 0) return;

  await Location.startGeofencingAsync(LOCATION_GEOFENCE_TASK, regions);
}

async function reportAppOpen(): Promise<void> {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (!foreground.granted) return;
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  await reportDeviceLocation({
    trigger: LOCATION_TRIGGER.appOpen,
    update: {
      gps: [position.coords.latitude, position.coords.longitude],
      gpsAccuracy:
        position.coords.accuracy !== null
          ? Math.round(position.coords.accuracy)
          : undefined,
    },
  });
}

/**
 * Companion-style location: geofences for HA zones, plus a ping when the app
 * comes to the foreground. Demo mode does not report.
 */
export function useLocationSession(): void {
  const mode = useHaStore((state) => state.mode);
  const status = useHaStore((state) => state.status);
  const registration = useHaStore((state) => state.registration);
  const activeUrl = useHaStore((state) => state.activeUrl);
  const zoneKey = useHaStore((state) => {
    return zonesFromEntities(state.entities)
      .map(
        (zone) =>
          `${zone.identifier}:${zone.latitude}:${zone.longitude}:${zone.radius}`,
      )
      .sort()
      .join("|");
  });
  const reportedOpen = useRef(false);

  useEffect(() => {
    if (mode !== "live" || status !== "connected" || !registration) return;

    let cancelled = false;
    void (async () => {
      const urls = await webhookUrls();
      if (cancelled || urls.length === 0) return;
      await saveLocationTargets({ webhookId: registration.webhookId, urls });
      if (!(await ensureLocationPermission()) || cancelled) return;
      await ensureLastUpdateTriggerSensor();
      if (cancelled) return;
      await syncGeofences(useHaStore.getState().entities);
      if (cancelled || reportedOpen.current) return;
      reportedOpen.current = true;
      await reportAppOpen();
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, status, registration, activeUrl, zoneKey]);

  useEffect(() => {
    if (mode !== "live") return;

    const onChange = (next: AppStateStatus) => {
      if (next !== "active") return;
      void reportAppOpen();
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [mode]);
}
