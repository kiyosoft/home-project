import {
  clamp,
  deriveLight,
  groupMemberIds,
  lightColor,
  lightIntensity,
  numericAttr,
  stringAttr,
  type HassEntities,
  type Rgb,
} from "@ethio/ha-sdk";
import { useMemo } from "react";

import type { MessageKey, TranslateParams } from "@/i18n";
import { useHaStore } from "@/store/ha-store";
import { entityDomain } from "@/store/use-entity";

/** Every lit lamp in the house folded into one colour. */
export interface LampBlend {
  color: Rgb;
  /** 0 to 1. Saturates as more lamps come on rather than averaging down. */
  intensity: number;
}

export interface HomeSummary {
  lightsOn: number;
  lockCount: number;
  unlocked: number;
  playing: number;
  /** Mean of every thermostat reporting a current temperature. */
  temperature: number | null;
  temperatureUnit: string;
  /** Null when the house is dark, which leaves the ambient wash off. */
  lamp: LampBlend | null;
}

const EMPTY: HomeSummary = {
  lightsOn: 0,
  lockCount: 0,
  unlocked: 0,
  playing: 0,
  temperature: null,
  temperatureUnit: "",
  lamp: null,
};

/** A lamp dimmed to nothing still has a hue worth blending. */
const MIN_COLOR_WEIGHT = 0.05;

/**
 * Weighted mean hue, but the intensities combine rather than average: two lamps
 * at half power light a room more than one does, where a mean would say the
 * same. Matches how the eye reads a room filling with light.
 */
function blendLamps(lamps: LampBlend[]): LampBlend | null {
  if (lamps.length === 0) return null;

  let r = 0;
  let g = 0;
  let b = 0;
  let weight = 0;
  let dark = 1;

  for (const lamp of lamps) {
    const w = Math.max(lamp.intensity, MIN_COLOR_WEIGHT);
    r += lamp.color[0] * w;
    g += lamp.color[1] * w;
    b += lamp.color[2] * w;
    weight += w;
    dark *= 1 - clamp(lamp.intensity, 0, 1);
  }

  return {
    color: [
      Math.round(r / weight),
      Math.round(g / weight),
      Math.round(b / weight),
    ],
    intensity: 1 - dark,
  };
}

/**
 * Folds the whole entity map into the handful of facts the Home header and the
 * ambient background need. Nothing in the SDK aggregates across entities, so
 * this is the one place that does.
 */
export function summarizeHome(entities: HassEntities): HomeSummary {
  const lamps: LampBlend[] = [];
  let lightsOn = 0;
  let lockCount = 0;
  let unlocked = 0;
  let playing = 0;
  let tempTotal = 0;
  let tempCount = 0;
  let temperatureUnit = "";

  for (const entityId of Object.keys(entities)) {
    const entity = entities[entityId];
    if (!entity || entity.state === "unavailable") continue;

    switch (entityDomain(entityId)) {
      case "light": {
        if (groupMemberIds(entity).length > 0) break;
        const light = deriveLight(entity);
        if (!light?.isOn) break;
        lightsOn += 1;
        const intensity = lightIntensity(light);
        if (intensity > 0) {
          lamps.push({ color: lightColor(light), intensity });
        }
        break;
      }
      case "lock": {
        lockCount += 1;
        if (entity.state === "unlocked") unlocked += 1;
        break;
      }
      case "media_player": {
        if (entity.state === "playing") playing += 1;
        break;
      }
      case "climate": {
        const current = numericAttr(
          entity.attributes,
          "current_temperature",
        );
        if (current === undefined) break;
        tempTotal += current;
        tempCount += 1;
        if (!temperatureUnit) {
          temperatureUnit =
            stringAttr(entity.attributes, "temperature_unit") ?? "";
        }
        break;
      }
    }
  }

  return {
    lightsOn,
    lockCount,
    unlocked,
    playing,
    temperature: tempCount > 0 ? Math.round(tempTotal / tempCount) : null,
    temperatureUnit,
    lamp: blendLamps(lamps),
  };
}

/**
 * The one-line answer to "what is the house doing". Parts drop out when they
 * have nothing to say, so a home with no locks never reads "0 unlocked".
 */
export function formatHomeSummary(
  summary: HomeSummary,
  t: (key: MessageKey, params?: TranslateParams) => string,
): string {
  const parts: string[] = [];

  if (summary.lightsOn === 1) parts.push(t("home.summaryLightOne"));
  else if (summary.lightsOn > 1)
    parts.push(t("home.summaryLights", { count: summary.lightsOn }));
  else parts.push(t("home.summaryLightsOff"));

  if (summary.temperature !== null) {
    parts.push(`${summary.temperature}${summary.temperatureUnit}`);
  }

  if (summary.unlocked === 1) parts.push(t("home.summaryUnlockedOne"));
  else if (summary.unlocked > 1)
    parts.push(t("home.summaryUnlocked", { count: summary.unlocked }));
  else if (summary.lockCount > 0) parts.push(t("home.summaryLocked"));

  if (summary.playing === 1) parts.push(t("home.summaryPlayingOne"));
  else if (summary.playing > 1)
    parts.push(t("home.summaryPlaying", { count: summary.playing }));

  return parts.join(" · ");
}

/**
 * The store replaces the entity map on every HA update, so this recomputes
 * whenever anything in the house moves and memoizes in between.
 */
export function useHomeSummary(): HomeSummary {
  const entities = useHaStore((state) => state.entities);
  return useMemo(
    () => (entities ? summarizeHome(entities) : EMPTY),
    [entities],
  );
}
