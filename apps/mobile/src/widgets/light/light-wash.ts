import {
  lampColor,
  lampInk,
  lightColor,
  lightGlow,
  lightIntensity,
  rgbaCss,
  type LightLike,
  type Rgb,
} from "@ethio/ha-sdk";
import { useColorScheme } from "react-native";

export interface LightWash {
  color: Rgb;
  intensity: number;
  /** The lamp at full power, for the dimmer fill and the switch track. */
  fill: string;
  /** Laid over the tile in place of the generic active overlay. */
  overlay: string;
  border: string;
  /** Unfilled part of the dimmer track. */
  track: string;
  switchThumb: string;
}

/**
 * The mobile twin of the web `lightWash`. Same lamp and same alpha ramp, but
 * emitting React Native colors, and the web's outer glow collapses to a rim
 * plus a flat overlay so the tile stays inside its own bounds.
 *
 * Returns null when the lamp is dark, letting a tile fall back to its plain
 * unlit styling.
 */
export function lightWash(
  light: LightLike,
  /** A pale theme swallows glow, so the ramp leans harder on the rim. */
  brightSurface: boolean,
  /** In-flight values from a drag, so the tile tracks the finger. */
  pending: { brightness?: number; color?: Rgb } = {},
): LightWash | null {
  const color = pending.color ?? lightColor(light);
  const intensity = lightIntensity(light, pending.brightness);
  if (intensity <= 0) return null;

  const lamp = lampColor(color);
  const glow = lightGlow(intensity, brightSurface);

  return {
    color,
    intensity,
    fill: rgbaCss(lamp),
    overlay: rgbaCss(lamp, glow.mid * 0.5),
    border: rgbaCss(lamp, glow.rim),
    track: rgbaCss(lamp, brightSurface ? 0.16 : 0.22),
    switchThumb: rgbaCss(lampInk(lamp)),
  };
}

/** Uniwind writes the chosen theme into Appearance, so this is the surface. */
export function useLightWash(
  light: LightLike | null,
  pending: { brightness?: number; color?: Rgb } = {},
): LightWash | null {
  const scheme = useColorScheme();
  if (!light) return null;
  return lightWash(light, scheme !== "dark", pending);
}
