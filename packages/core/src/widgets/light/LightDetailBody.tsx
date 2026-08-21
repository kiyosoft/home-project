import { useCallback } from "react";

import { useLight } from "@ethio/plugin-sdk";

import {
  ColorStrip,
  kelvinToRgb,
  Slider,
  Switch,
  useServiceValue,
  useThemeSurface,
  type Rgb,
} from "../../ui";
import {
  currentHue,
  hueToRgb,
  lightWash,
  resolveKelvin,
} from "./light-visuals";

export function LightDetailBody({ entityId }: { entityId: string }) {
  const light = useLight(entityId);
  const surface = useThemeSurface();

  const applyBrightness = useCallback(
    async (percent: number) => {
      if (!light) return;
      if (percent <= 0) {
        await light.turnOff();
        return;
      }
      await light.setBrightnessPercent(percent);
    },
    [light],
  );

  const applyHue = useCallback(
    async (hue: number) => {
      if (!light) return;
      await light.setRgbColor(hueToRgb(hue, light.rgbColor));
    },
    [light],
  );

  const applyKelvin = useCallback(
    async (kelvin: number) => {
      if (!light) return;
      await light.setColorTemp(kelvin);
    },
    [light],
  );

  const minKelvin = resolveKelvin(light?.minColorTempKelvin) ?? 2200;
  const maxKelvin = resolveKelvin(light?.maxColorTempKelvin) ?? 6500;
  const entityKelvin = resolveKelvin(light?.colorTemp) ?? minKelvin;

  const brightness = useServiceValue(
    light?.brightnessPercent ?? 0,
    applyBrightness,
  );
  const hue = useServiceValue(light ? currentHue(light.rgbColor) : 0, applyHue);
  const kelvin = useServiceValue(entityKelvin, applyKelvin);

  if (!light) {
    return <p className="text-sm text-muted-foreground">Light unavailable</p>;
  }

  const unavailable = light.state === "unavailable";
  const huePending =
    light.supportsRgb && hue.value !== currentHue(light.rgbColor);
  const kelvinPending =
    !light.supportsRgb && light.supportsColorTemp && kelvin.value !== entityKelvin;

  let pendingColor: Rgb | undefined;
  if (huePending) pendingColor = hueToRgb(hue.value, light.rgbColor);
  else if (kelvinPending) pendingColor = kelvinToRgb(kelvin.value);

  const wash = lightWash(light, surface, {
    brightness: brightness.value,
    color: pendingColor,
  });

  return (
    <div className="space-y-5">
      <div
        className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 text-card-foreground motion-safe:transition-[border-color,box-shadow] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={wash.surfaceStyle}
      >
        <p className="font-display text-3xl font-semibold leading-none tracking-tight">
          {light.isOn ? "On" : "Off"}
        </p>
        <Switch
          checked={light.isOn}
          disabled={unavailable}
          label={light.isOn ? "Turn off" : "Turn on"}
          activeColor={wash.switchTrack}
          activeThumbColor={wash.switchThumb}
          onCheckedChange={() => void light.toggle()}
        />
      </div>

      {light.supportsBrightness ? (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Brightness</span>
            <span className="text-muted-foreground">{brightness.value}%</span>
          </div>
          <Slider
            value={brightness.value}
            min={0}
            max={100}
            size="lg"
            label="Brightness"
            disabled={unavailable}
            fill={wash.fill}
            onValueChange={brightness.onValueChange}
            onValueCommit={brightness.onValueCommit}
          />
        </div>
      ) : null}

      {light.supportsRgb ? (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Color</span>
            <span className="text-muted-foreground">{hue.value}&deg;</span>
          </div>
          <ColorStrip
            variant="hue"
            value={hue.value}
            size="lg"
            label="Color"
            disabled={unavailable}
            swatch={hueToRgb(hue.value, light.rgbColor)}
            onValueChange={hue.onValueChange}
            onValueCommit={hue.onValueCommit}
          />
        </div>
      ) : null}

      {light.supportsColorTemp ? (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Warmth</span>
            <span className="text-muted-foreground">{kelvin.value} K</span>
          </div>
          <ColorStrip
            variant="kelvin"
            value={kelvin.value}
            min={minKelvin}
            max={maxKelvin}
            size="lg"
            label="Color temperature"
            disabled={unavailable}
            onValueChange={kelvin.onValueChange}
            onValueCommit={kelvin.onValueCommit}
          />
        </div>
      ) : null}

      {light.supportsEffects && light.availableEffects.length > 0 ? (
        <label className="block space-y-2 text-sm">
          <span>Effect</span>
          <select
            value={light.effect || ""}
            disabled={unavailable}
            onChange={(event) => {
              void light.setEffect(event.target.value);
            }}
            className="w-full rounded-xl border border-border bg-background px-3 py-2"
          >
            {light.availableEffects.map((effect) => (
              <option key={effect} value={effect}>
                {effect}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
