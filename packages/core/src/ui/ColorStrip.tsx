import {
  hueGradient,
  kelvinGradient,
  kelvinToRgb,
  rgbCss,
  type Rgb,
} from "./color-utils";
import { Slider, type SliderSize } from "./Slider";

export interface ColorStripProps {
  variant: "hue" | "kelvin";
  value: number;
  min?: number;
  max?: number;
  onValueChange?: (value: number) => void;
  onValueCommit?: (value: number) => void;
  disabled?: boolean;
  label: string;
  size?: SliderSize;
  /** Overrides the thumb tint, e.g. the light's live RGB for a hue strip. */
  swatch?: Rgb;
  className?: string;
}

/** A gradient track for picking hue or white point, dragged like a dimmer. */
export function ColorStrip({
  variant,
  value,
  min,
  max,
  onValueChange,
  onValueCommit,
  disabled = false,
  label,
  size = "md",
  swatch,
  className,
}: ColorStripProps) {
  const isHue = variant === "hue";
  const lowerBound = min ?? (isHue ? 0 : 2200);
  const upperBound = max ?? (isHue ? 360 : 6500);

  const trackBackground = isHue
    ? hueGradient()
    : kelvinGradient(lowerBound, upperBound);

  const thumbColor = swatch
    ? rgbCss(swatch)
    : isHue
      ? `hsl(${value} 100% 50%)`
      : rgbCss(kelvinToRgb(value));

  return (
    <Slider
      value={value}
      min={lowerBound}
      max={upperBound}
      step={1}
      onValueChange={onValueChange}
      onValueCommit={onValueCommit}
      disabled={disabled}
      label={label}
      size={size}
      fill={null}
      trackBackground={trackBackground}
      thumbColor={thumbColor}
      className={className}
    />
  );
}
