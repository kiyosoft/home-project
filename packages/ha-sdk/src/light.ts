import type { HassEntity } from "./types";

export type LightColorMode =
  | "onoff"
  | "brightness"
  | "color_temp"
  | "hs"
  | "xy"
  | "rgb"
  | "rgbw"
  | "rgbww"
  | "white";

function strAttr(
  attrs: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = attrs[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numAttr(
  attrs: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = attrs[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function rgbTuple(value: unknown): [number, number, number] | undefined {
  if (!Array.isArray(value) || value.length < 3) return undefined;
  const r = Number(value[0]);
  const g = Number(value[1]);
  const b = Number(value[2]);
  if (![r, g, b].every((n) => Number.isFinite(n))) return undefined;
  return [r, g, b];
}

export function lightColorModes(entity: HassEntity | undefined): LightColorMode[] {
  if (!entity) return [];
  return stringList(entity.attributes.supported_color_modes) as LightColorMode[];
}

export function lightSupportsBrightness(entity: HassEntity | undefined): boolean {
  const modes = lightColorModes(entity);
  if (modes.length === 0) {
    return numAttr(entity?.attributes ?? {}, "brightness") != null;
  }
  return modes.some((mode) => mode !== "onoff");
}

export function lightSupportsRgb(entity: HassEntity | undefined): boolean {
  const modes = lightColorModes(entity);
  return modes.some(
    (mode) =>
      mode === "rgb" || mode === "rgbw" || mode === "rgbww" || mode === "hs",
  );
}

export function lightSupportsColorTemp(entity: HassEntity | undefined): boolean {
  return lightColorModes(entity).includes("color_temp");
}

export function lightSupportsEffects(entity: HassEntity | undefined): boolean {
  return stringList(entity?.attributes.effect_list).length > 0;
}

export interface LightView {
  entityId: string;
  state: string;
  attributes: Record<string, unknown>;
  isOn: boolean;
  brightness: number;
  brightnessPercent: number;
  rgbColor: [number, number, number];
  colorTemp: number | undefined;
  minColorTempKelvin: number | undefined;
  maxColorTempKelvin: number | undefined;
  effect: string;
  availableEffects: string[];
  supportsBrightness: boolean;
  supportsRgb: boolean;
  supportsColorTemp: boolean;
  supportsEffects: boolean;
}

export function deriveLight(entity: HassEntity | undefined): LightView | null {
  if (!entity) return null;
  const attrs = entity.attributes;
  const brightness = numAttr(attrs, "brightness") ?? 0;
  const rgb = rgbTuple(attrs.rgb_color) ?? [255, 255, 255];
  return {
    entityId: entity.entity_id,
    state: entity.state,
    attributes: attrs,
    isOn: entity.state === "on",
    brightness,
    brightnessPercent: Math.round((brightness / 255) * 100),
    rgbColor: rgb,
    colorTemp:
      numAttr(attrs, "color_temp_kelvin") ?? numAttr(attrs, "color_temp"),
    minColorTempKelvin: numAttr(attrs, "min_color_temp_kelvin"),
    maxColorTempKelvin: numAttr(attrs, "max_color_temp_kelvin"),
    effect: strAttr(attrs, "effect") ?? "",
    availableEffects: stringList(attrs.effect_list),
    supportsBrightness: lightSupportsBrightness(entity),
    supportsRgb: lightSupportsRgb(entity),
    supportsColorTemp: lightSupportsColorTemp(entity),
    supportsEffects: lightSupportsEffects(entity),
  };
}
