import type { CSSProperties } from "react";

import {
  blendRgb,
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
 * entity state so dragging up from off lights the surface at once.
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
  /** Ink-contrasted switch colors, since a lamp-colored switch vanishes into the wash. */
  switchTrack: string | undefined;
  switchThumb: string | undefined;
}

/**
 * The card is the lamp: its surface carries the real color at the real
 * brightness, and ink is chosen against the blended result.
 */
export function lightWash(
  light: LightLike,
  surface: ThemeSurface,
  /** In-flight values from a drag, so the surface tracks the finger. */
  pending: { brightness?: number; color?: Rgb } = {},
): LightWash {
  const color = pending.color ?? lightColor(light);
  const intensity = lightIntensity(light, pending.brightness);
  const hsv = rgbToHsv(color);
  // Saturated past the blended surface so the filled part of the track reads.
  const fill = rgbCss(hsvToRgb({ h: hsv.h, s: Math.min(1, hsv.s * 1.15), v: 1 }));
  const litCard = isBrightSurface(surface.card);

  if (intensity <= 0) {
    return {
      color,
      intensity,
      // An unlit bulb reports no color, so a neutral keeps the thumb visible.
      fill: "var(--color-muted-foreground)",
      ink: "var(--color-card-foreground)",
      inkMuted: "var(--color-muted-foreground)",
      // A pale theme needs the dark bulb to sit below the card, otherwise a lit
      // white light looks identical to an unlit one.
      surfaceStyle: litCard
        ? { backgroundColor: rgbCss(blendRgb([0, 0, 0], surface.card, 0.07)) }
        : {},
      trackBackground: "var(--color-muted)",
      switchTrack: undefined,
      switchThumb: undefined,
    };
  }

  const alpha = 0.2 + 0.55 * intensity;
  const blended = blendRgb(color, surface.card, alpha);
  const bright = isBrightSurface(blended);

  return {
    color,
    intensity,
    fill,
    ink: bright ? "rgb(26 22 18)" : "rgb(252 251 249)",
    inkMuted: bright ? "rgb(26 22 18 / 0.68)" : "rgb(252 251 249 / 0.74)",
    trackBackground: bright ? "rgb(26 22 18 / 0.2)" : "rgb(252 251 249 / 0.22)",
    switchTrack: bright ? "rgb(26 22 18 / 0.86)" : "rgb(252 251 249 / 0.9)",
    switchThumb: rgbCss(blended),
    surfaceStyle: {
      backgroundColor: rgbCss(blended),
      backgroundImage: `radial-gradient(115% 95% at 82% -12%, ${rgbCss(
        color,
        0.28 + 0.34 * intensity,
      )}, transparent 64%)`,
      borderColor: rgbCss(blendRgb(color, bright ? [0, 0, 0] : [255, 255, 255], 0.72), 0.5),
      boxShadow: `0 16px 36px -20px ${rgbCss(color, 0.55 * intensity)}, inset 0 1px 0 rgb(255 255 255 / ${bright ? 0.4 : 0.12})`,
      color: bright ? "rgb(26 22 18)" : "rgb(252 251 249)",
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
