import type { CSSProperties } from "react";

import {
  clamp,
  hsvToRgb,
  isBrightSurface,
  kelvinToRgb,
  rgbCss,
  rgbToHsv,
  type Rgb,
  type ThemeSurface,
} from "../../ui";

/** A bulb with no color capability still reads as warm tungsten. */
const TUNGSTEN: Rgb = [255, 205, 145];

interface LightLike {
  isOn: boolean;
  brightnessPercent: number;
  rgbColor: Rgb;
  colorTemp: number | undefined;
  supportsBrightness: boolean;
  supportsRgb: boolean;
  supportsColorTemp: boolean;
}

/** Home Assistant reports mireds on older lights; kelvin is always > 1000. */
export function resolveKelvin(value: number | undefined): number | undefined {
  if (value == null || !Number.isFinite(value) || value <= 0) return undefined;
  return value < 1000 ? Math.round(1_000_000 / value) : value;
}

export function lightColor(light: LightLike): Rgb {
  if (light.supportsRgb) return light.rgbColor;
  const kelvin = resolveKelvin(light.colorTemp);
  if (light.supportsColorTemp && kelvin) return kelvinToRgb(kelvin);
  return TUNGSTEN;
}

/**
 * Intensity of the light as shown, 0 when off. A pending brightness wins over
 * entity state so dragging up from off lights the rim at once.
 */
export function lightIntensity(light: LightLike, brightness?: number): number {
  if (brightness != null && brightness > 0) return clamp(brightness / 100, 0, 1);
  if (!light.isOn) return 0;
  if (!light.supportsBrightness) return 1;
  return clamp(light.brightnessPercent / 100, 0, 1);
}

export interface LightWash {
  color: Rgb;
  intensity: number;
  /** The lamp color at full power, used to fill the dimmer track. */
  fill: string;
  ink: string;
  inkMuted: string;
  surfaceStyle: CSSProperties;
  trackBackground: string;
  /** Active switch follows the lamp so the control matches the rim. */
  switchTrack: string | undefined;
  switchThumb: string | undefined;
}

/**
 * The lamp lives on the rim: color and brightness become a glow outline so the
 * card surface stays the theme, and neighboring widgets are not washed out.
 */
export function lightWash(
  light: LightLike,
  surface: ThemeSurface,
  /** In-flight values from a drag, so the rim tracks the finger. */
  pending: { brightness?: number; color?: Rgb } = {},
): LightWash {
  const color = pending.color ?? lightColor(light);
  const intensity = lightIntensity(light, pending.brightness);
  const hsv = rgbToHsv(color);
  // Pale bulbs stay warm tungsten; colored ones get a slightly richer rim.
  const lamp =
    hsv.s < 0.12
      ? TUNGSTEN
      : hsvToRgb({ h: hsv.h, s: Math.min(1, hsv.s * 1.15), v: 1 });
  const fill = rgbCss(lamp);
  const litCard = isBrightSurface(surface.card);

  if (intensity <= 0) {
    return {
      color,
      intensity,
      // An unlit bulb reports no color, so a neutral keeps the thumb visible.
      fill: "var(--color-muted-foreground)",
      ink: "var(--color-card-foreground)",
      inkMuted: "var(--color-muted-foreground)",
      surfaceStyle: {},
      trackBackground: "var(--color-muted)",
      switchTrack: undefined,
      switchThumb: undefined,
    };
  }

  const brightLamp = isBrightSurface(lamp);
  // Pale themes swallow glow; push the rim harder so a white bulb still reads.
  const rim = litCard ? 0.55 + 0.4 * intensity : 0.4 + 0.5 * intensity;
  const near = litCard ? 0.4 + 0.35 * intensity : 0.38 + 0.42 * intensity;
  const mid = litCard ? 0.2 + 0.22 * intensity : 0.26 + 0.3 * intensity;
  const far = litCard ? 0.08 + 0.12 * intensity : 0.12 + 0.18 * intensity;

  return {
    color,
    intensity,
    fill,
    ink: "var(--color-card-foreground)",
    inkMuted: "var(--color-muted-foreground)",
    trackBackground: rgbCss(lamp, litCard ? 0.16 : 0.22),
    switchTrack: fill,
    switchThumb: brightLamp ? "rgb(26 22 18)" : "rgb(252 251 249)",
    surfaceStyle: {
      borderColor: rgbCss(lamp, rim),
      boxShadow: [
        `inset 0 0 0 1px ${rgbCss(lamp, 0.22 + 0.5 * intensity)}`,
        `inset 0 0 ${8 + 6 * intensity}px ${rgbCss(lamp, mid * 0.8)}`,
        `0 0 ${12 + 10 * intensity}px ${rgbCss(lamp, near)}`,
        `0 0 ${28 + 24 * intensity}px ${rgbCss(lamp, mid)}`,
        `0 0 ${56 + 40 * intensity}px ${rgbCss(lamp, far)}`,
      ].join(", "),
    },
  };
}

/** Keeps saturation while sweeping hue, so a white light does not stay white. */
export function hueToRgb(hue: number, current: Rgb): Rgb {
  const { s } = rgbToHsv(current);
  return hsvToRgb({ h: hue, s: s > 0.12 ? s : 1, v: 1 });
}

export function currentHue(rgb: Rgb): number {
  return Math.round(rgbToHsv(rgb).h);
}
