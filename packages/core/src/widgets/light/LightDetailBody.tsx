import { useState } from "react";

import { useLight } from "@ethio/plugin-sdk";

function rgbToHex(rgb: [number, number, number]): string {
  return `#${rgb
    .map((channel) =>
      Math.min(255, Math.max(0, Math.round(channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return null;
  const r = Number.parseInt(cleaned.slice(0, 2), 16);
  const g = Number.parseInt(cleaned.slice(2, 4), 16);
  const b = Number.parseInt(cleaned.slice(4, 6), 16);
  if (![r, g, b].every((n) => Number.isFinite(n))) return null;
  return [r, g, b];
}

export function LightDetailBody({ entityId }: { entityId: string }) {
  const light = useLight(entityId);
  const [pending, setPending] = useState(false);

  if (!light) {
    return <p className="text-sm text-muted-foreground">Light unavailable</p>;
  }

  async function run(action: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    try {
      await action();
    } finally {
      setPending(false);
    }
  }

  const minKelvin = light.minColorTempKelvin ?? 2200;
  const maxKelvin = light.maxColorTempKelvin ?? 6500;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="font-display text-2xl font-semibold">
            {light.isOn ? "On" : "Off"}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => void run(() => light.toggle())}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          Toggle
        </button>
      </div>

      {light.isOn && light.supportsBrightness ? (
        <label className="block space-y-2">
          <div className="flex justify-between text-sm">
            <span>Brightness</span>
            <span className="text-muted-foreground">
              {light.brightnessPercent}%
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={Math.max(1, light.brightnessPercent)}
            disabled={pending}
            onChange={(event) => {
              void run(() =>
                light.setBrightnessPercent(Number(event.target.value)),
              );
            }}
            className="w-full accent-primary"
          />
        </label>
      ) : null}

      {light.isOn && light.supportsRgb ? (
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Color</span>
          <input
            type="color"
            value={rgbToHex(light.rgbColor)}
            disabled={pending}
            onChange={(event) => {
              const rgb = hexToRgb(event.target.value);
              if (!rgb) return;
              void run(() => light.setRgbColor(rgb));
            }}
            className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent"
          />
        </label>
      ) : null}

      {light.isOn && light.supportsColorTemp ? (
        <label className="block space-y-2">
          <div className="flex justify-between text-sm">
            <span>Color temperature</span>
            <span className="text-muted-foreground">
              {light.colorTemp ?? minKelvin} K
            </span>
          </div>
          <input
            type="range"
            min={minKelvin}
            max={maxKelvin}
            value={light.colorTemp ?? minKelvin}
            disabled={pending}
            onChange={(event) => {
              void run(() => light.setColorTemp(Number(event.target.value)));
            }}
            className="w-full accent-primary"
          />
        </label>
      ) : null}

      {light.isOn && light.supportsEffects && light.availableEffects.length > 0 ? (
        <label className="block space-y-2 text-sm">
          <span>Effect</span>
          <select
            value={light.effect || ""}
            disabled={pending}
            onChange={(event) => {
              void run(() => light.setEffect(event.target.value));
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
