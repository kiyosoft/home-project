import {
  clamp,
  hsvToRgb,
  isBrightSurface,
  kelvinToRgb,
  rgbToHsv,
  type Rgb,
} from "./color";

/** A bulb with no color capability still reads as warm tungsten. */
export const TUNGSTEN: Rgb = [255, 205, 145];

const INK_ON_BRIGHT: Rgb = [26, 22, 18];
const INK_ON_DARK: Rgb = [252, 251, 249];

/** The slice of a light a wash needs; both `LightView` and a partial satisfy it. */
export interface LightLike {
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

/** Pale bulbs stay warm tungsten; colored ones get a slightly richer rim. */
export function lampColor(color: Rgb): Rgb {
  const hsv = rgbToHsv(color);
  return hsv.s < 0.12
    ? TUNGSTEN
    : hsvToRgb({ h: hsv.h, s: Math.min(1, hsv.s * 1.15), v: 1 });
}

/** Whatever sits on the lamp — a switch thumb, a label — needs the contrast. */
export function lampInk(lamp: Rgb): Rgb {
  return isBrightSurface(lamp) ? INK_ON_BRIGHT : INK_ON_DARK;
}

export interface LightGlow {
  /** Border of the card. */
  rim: number;
  /** Hairline just inside the border, separating card from glow. */
  edge: number;
  near: number;
  mid: number;
  far: number;
}

/**
 * Alpha ramp for the glow layers. Pale themes swallow glow, so a bright surface
 * pushes the rim harder and the outer haze softer.
 */
export function lightGlow(intensity: number, brightSurface: boolean): LightGlow {
  return {
    rim: brightSurface ? 0.55 + 0.4 * intensity : 0.4 + 0.5 * intensity,
    edge: 0.22 + 0.5 * intensity,
    near: brightSurface ? 0.4 + 0.35 * intensity : 0.38 + 0.42 * intensity,
    mid: brightSurface ? 0.2 + 0.22 * intensity : 0.26 + 0.3 * intensity,
    far: brightSurface ? 0.08 + 0.12 * intensity : 0.12 + 0.18 * intensity,
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
