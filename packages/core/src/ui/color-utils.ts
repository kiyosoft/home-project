import { kelvinToRgb, type Rgb } from "@ethio/ha-sdk";

/**
 * The color math lives in the SDK so the mobile app derives identical lamp
 * colors. Only the CSS output stays here.
 */
export {
  blendRgb,
  clamp,
  hexToRgb,
  hsvToRgb,
  isBrightSurface,
  kelvinToRgb,
  relativeLuminance,
  rgbToHex,
  rgbToHsv,
} from "@ethio/ha-sdk";
export type { Hsv, Rgb } from "@ethio/ha-sdk";

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

export function rgbCss(rgb: Rgb, alpha = 1): string {
  const [r, g, b] = rgb.map(clampChannel);
  return alpha >= 1
    ? `rgb(${r} ${g} ${b})`
    : `rgb(${r} ${g} ${b} / ${Math.round(alpha * 1000) / 1000})`;
}

export function hueGradient(): string {
  const stops = [0, 60, 120, 180, 240, 300, 360].map(
    (hue) => `hsl(${hue} 100% 50%)`,
  );
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

export function kelvinGradient(minKelvin: number, maxKelvin: number): string {
  const steps = 8;
  const stops: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const kelvin = minKelvin + ((maxKelvin - minKelvin) * i) / steps;
    stops.push(`${rgbCss(kelvinToRgb(kelvin))} ${(i / steps) * 100}%`);
  }
  return `linear-gradient(to right, ${stops.join(", ")})`;
}
