export type Rgb = [number, number, number];

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function rgbCss(rgb: Rgb, alpha = 1): string {
  const [r, g, b] = rgb.map(clampChannel);
  return alpha >= 1
    ? `rgb(${r} ${g} ${b})`
    : `rgb(${r} ${g} ${b} / ${Math.round(alpha * 1000) / 1000})`;
}

export function rgbToHex(rgb: Rgb): string {
  return `#${rgb
    .map((channel) => clampChannel(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function hexToRgb(hex: string): Rgb | null {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return null;
  const r = Number.parseInt(cleaned.slice(0, 2), 16);
  const g = Number.parseInt(cleaned.slice(2, 4), 16);
  const b = Number.parseInt(cleaned.slice(4, 6), 16);
  if (![r, g, b].every((n) => Number.isFinite(n))) return null;
  return [r, g, b];
}

export interface Hsv {
  h: number;
  s: number;
  v: number;
}

export function rgbToHsv(rgb: Rgb): Hsv {
  const r = clamp(rgb[0], 0, 255) / 255;
  const g = clamp(rgb[1], 0, 255) / 255;
  const b = clamp(rgb[2], 0, 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta > 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 1);
  const value = clamp(v, 0, 1);
  const c = value * saturation;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = value - c;

  const sector = Math.floor(hue / 60) % 6;
  const [r, g, b] = (
    [
      [c, x, 0],
      [x, c, 0],
      [0, c, x],
      [0, x, c],
      [x, 0, c],
      [c, 0, x],
    ] as const
  )[sector];

  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/**
 * Tanner Helland's blackbody approximation, accurate enough between 1000K and
 * 40000K for tinting UI to match a bulb's white point.
 */
export function kelvinToRgb(kelvin: number): Rgb {
  const temp = clamp(kelvin, 1000, 40000) / 100;

  let r: number;
  let g: number;
  let b: number;

  if (temp <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
  } else {
    r = 329.698727446 * (temp - 60) ** -0.1332047592;
    g = 288.1221695283 * (temp - 60) ** -0.0755148492;
  }

  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  }

  return [clampChannel(r), clampChannel(g), clampChannel(b)];
}

function channelLuminance(channel: number): number {
  const c = clamp(channel, 0, 255) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(rgb: Rgb): number {
  return (
    0.2126 * channelLuminance(rgb[0]) +
    0.7152 * channelLuminance(rgb[1]) +
    0.0722 * channelLuminance(rgb[2])
  );
}

/** Blend `top` over `bottom` at `alpha` so contrast can be judged on the result. */
export function blendRgb(top: Rgb, bottom: Rgb, alpha: number): Rgb {
  const a = clamp(alpha, 0, 1);
  return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)) as Rgb;
}

/** Dark ink on bright washes, light ink on deep ones. */
export function isBrightSurface(rgb: Rgb): boolean {
  return relativeLuminance(rgb) > 0.35;
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
