import { useCallback, useRef, type KeyboardEvent } from "react";
import { z } from "zod";

import {
  defineWidget,
  PluginScope,
  useDetailModal,
  useLight,
  usePluginId,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

import {
  ColorStrip,
  Slider,
  Switch,
  useElementSize,
  useServiceValue,
  useThemeSurface,
} from "../ui";
import { LightDetailBody } from "./light/LightDetailBody";
import {
  currentHue,
  hueToRgb,
  lightWash,
} from "./light/light-visuals";

export const lightConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
});

/** Enough room for the hue strip without crowding the dimmer. */
const HUE_STRIP_MIN_HEIGHT = 210;
const HUE_STRIP_MIN_WIDTH = 200;
const COMPACT_HEIGHT = 172;

function stopPropagation(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

function stopKeys(event: KeyboardEvent) {
  event.stopPropagation();
}

function LightWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
  const customTitle =
    typeof config.title === "string" ? config.title.trim() : "";
  const light = useLight(entityId);
  const detailModal = useDetailModal();
  const pluginId = usePluginId();
  const surface = useThemeSurface();
  const [cardRef, cardSize] = useElementSize<HTMLDivElement>();
  // A drag that ends outside the slider gets its click dispatched on the card,
  // where stopPropagation on the control can no longer help.
  const pressedControl = useRef(false);

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

  const brightness = useServiceValue(
    light?.brightnessPercent ?? 0,
    applyBrightness,
  );
  const hue = useServiceValue(
    light ? currentHue(light.rgbColor) : 0,
    applyHue,
  );

  if (!entityId) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <h3 className="font-display text-base font-semibold">
          {customTitle || "Light"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a light entity in settings.
        </p>
      </div>
    );
  }

  if (!light) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-dashed border-border bg-card p-5">
        <h3 className="font-display text-base font-semibold">
          {customTitle || entityId}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">Entity unavailable</p>
      </div>
    );
  }

  const displayTitle =
    customTitle ||
    (typeof light.attributes.friendly_name === "string"
      ? light.attributes.friendly_name
      : light.entityId);

  const hueIsPending =
    light.supportsRgb && hue.value !== currentHue(light.rgbColor);
  const wash = lightWash(light, surface, {
    brightness: brightness.value,
    color: hueIsPending ? hueToRgb(hue.value, light.rgbColor) : undefined,
  });

  const unavailable = light.state === "unavailable";
  const compact = cardSize.height > 0 && cardSize.height < COMPACT_HEIGHT;
  const showHueStrip =
    light.supportsRgb &&
    light.isOn &&
    cardSize.height >= HUE_STRIP_MIN_HEIGHT &&
    cardSize.width >= HUE_STRIP_MIN_WIDTH;

  function openDetail() {
    if (!interactive || !pluginId) return;
    detailModal.open({
      title: displayTitle,
      description: "Light controls",
      className: "max-w-md",
      body: (
        <PluginScope pluginId={pluginId}>
          <LightDetailBody entityId={entityId} />
        </PluginScope>
      ),
    });
  }

  return (
    <div
      ref={cardRef}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onPointerDownCapture={(event) => {
        const target = event.target as Element | null;
        pressedControl.current = Boolean(
          target?.closest?.("input, button, select, textarea"),
        );
      }}
      onClick={
        interactive
          ? () => {
              if (pressedControl.current) {
                pressedControl.current = false;
                return;
              }
              openDetail();
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDetail();
              }
            }
          : undefined
      }
      className={`flex h-full min-h-36 w-full flex-col rounded-2xl border text-left shadow-sm motion-safe:transition-[background-color,border-color,box-shadow,color] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] ${
        compact ? "gap-3 p-4" : "gap-4 p-5"
      } ${
        light.isOn
          ? ""
          : "border-border bg-card text-card-foreground hover:border-primary/30"
      }`}
      style={wash.surfaceStyle}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-xs uppercase tracking-[0.14em]"
            style={{ color: wash.inkMuted }}
          >
            Light
          </p>
          <h3 className="mt-1 truncate font-display text-base font-semibold tracking-tight">
            {displayTitle}
          </h3>
        </div>
        <div onPointerDown={stopPropagation} onClick={stopPropagation} onKeyDown={stopKeys}>
          <Switch
            checked={light.isOn}
            disabled={!interactive || unavailable}
            label={light.isOn ? "Turn off" : "Turn on"}
            activeColor={wash.switchTrack}
            activeThumbColor={wash.switchThumb}
            onCheckedChange={() => void light.toggle()}
          />
        </div>
      </div>

      {compact ? null : (
        <p className="font-display text-3xl font-semibold leading-none tracking-tight">
          {light.isOn
            ? light.supportsBrightness
              ? `${Math.max(1, brightness.value)}%`
              : "On"
            : "Off"}
        </p>
      )}

      {light.supportsBrightness ? (
        <div
          className="mt-auto flex flex-col gap-2"
          onPointerDown={stopPropagation}
          onClick={stopPropagation}
          onKeyDown={stopKeys}
        >
          <div
            className="flex items-center justify-between text-xs"
            style={{ color: wash.inkMuted }}
          >
            <span>Brightness</span>
            {compact ? <span>{light.isOn ? `${brightness.value}%` : "Off"}</span> : null}
          </div>
          <Slider
            value={brightness.value}
            min={0}
            max={100}
            size={compact ? "sm" : "md"}
            label="Brightness"
            disabled={!interactive || unavailable}
            fill={wash.fill}
            trackBackground={wash.trackBackground}
            onValueChange={brightness.onValueChange}
            onValueCommit={brightness.onValueCommit}
          />
          {showHueStrip ? (
            <ColorStrip
              variant="hue"
              value={hue.value}
              size="sm"
              label="Color"
              className="mt-1"
              disabled={!interactive || unavailable}
              swatch={hueToRgb(hue.value, light.rgbColor)}
              onValueChange={hue.onValueChange}
              onValueCommit={hue.onValueCommit}
            />
          ) : null}
        </div>
      ) : (
        <p
          className="mt-auto truncate text-xs"
          style={{ color: wash.inkMuted }}
        >
          {interactive ? "Tap for details" : light.entityId}
        </p>
      )}
    </div>
  );
}

export const lightWidget = defineWidget({
  id: "@ethio/core/light",
  name: "Light",
  description: "Control lights with brightness, color, and effects",
  component: LightWidget,
  configSchema: lightConfigSchema,
  defaultConfig: { title: "", entity_id: "" },
  defaultSize: { w: 4, h: 4, minW: 2, minH: 3, maxW: 8, maxH: 6 },
  minSize: { w: 2, h: 3 },
  maxSize: { w: 8, h: 6 },
  entityDomains: ["light"],
  capabilities: ["entity.read", "service.call"],
});
