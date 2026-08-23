import {
  lampColor,
  lampInk,
  lightColor,
  lightGlow,
  lightIntensity,
  type LightLike,
  type Rgb,
} from "@ethio/ha-sdk";
import type { CSSProperties } from "react";

import { isBrightSurface, rgbCss, type ThemeSurface } from "../../ui";

export {
  currentHue,
  hueToRgb,
  lightColor,
  lightIntensity,
  resolveKelvin,
} from "@ethio/ha-sdk";

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
  const lamp = lampColor(color);
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

  const glow = lightGlow(intensity, litCard);

  return {
    color,
    intensity,
    fill,
    ink: "var(--color-card-foreground)",
    inkMuted: "var(--color-muted-foreground)",
    trackBackground: rgbCss(lamp, litCard ? 0.16 : 0.22),
    switchTrack: fill,
    switchThumb: rgbCss(lampInk(lamp)),
    surfaceStyle: {
      borderColor: rgbCss(lamp, glow.rim),
      boxShadow: [
        `inset 0 0 0 1px ${rgbCss(lamp, glow.edge)}`,
        `inset 0 0 ${8 + 6 * intensity}px ${rgbCss(lamp, glow.mid * 0.8)}`,
        `0 0 ${12 + 10 * intensity}px ${rgbCss(lamp, glow.near)}`,
        `0 0 ${28 + 24 * intensity}px ${rgbCss(lamp, glow.mid)}`,
        `0 0 ${56 + 40 * intensity}px ${rgbCss(lamp, glow.far)}`,
      ].join(", "),
    },
  };
}
