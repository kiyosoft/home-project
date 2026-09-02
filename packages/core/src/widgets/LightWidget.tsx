import { Lightbulb } from "lucide-react";
import { useCallback, useRef, type KeyboardEvent } from "react";
import { z } from "zod";

import {
  defineWidget,
  PluginScope,
  useDetailModal,
  useEntities,
  useLight,
  usePluginId,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";
import { boundEntityIds, formatFraction, isOnState, tallyEntities } from "@ethio/ha-sdk";

import {
  ColorStrip,
  Slider,
  Switch,
  cardShellClass,
  chipShellClass,
  useCardDensity,
  useServiceValue,
  useThemeSurface,
} from "../ui";
import { LightDetailBody } from "./light/LightDetailBody";
import {
  currentHue,
  hueToRgb,
  lightWash,
} from "./light/light-visuals";
import { ChipFace } from "./ChipFace";
import { widgetEntityId, widgetTitle } from "./names";
import { WidgetPlaceholder } from "./WidgetPlaceholder";

export const lightConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
});

/** Enough room for the hue strip without crowding the dimmer. */
const HUE_STRIP_MIN_HEIGHT = 210;
const HUE_STRIP_MIN_WIDTH = 200;

function stopPropagation(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

function stopKeys(event: KeyboardEvent) {
  event.stopPropagation();
}

function LightWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId = widgetEntityId(config);
  const customTitle = widgetTitle(config);
  const light = useLight(entityId);
  const entities = useEntities();
  const members = boundEntityIds({ entity_id: entityId }, entities[entityId]);
  const lightTally = tallyEntities(entities, members, isOnState);
  const groupStatus =
    members.length > 1
      ? formatFraction(lightTally.active, lightTally.total, "on")
      : null;
  const detailModal = useDetailModal();
  const pluginId = usePluginId();
  const surface = useThemeSurface();
  const { ref: cardRef, size: cardSize, compact, tight, chip } = useCardDensity();
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
      <WidgetPlaceholder
        title={customTitle || "Light"}
        message="Pick a light entity in settings."
      />
    );
  }

  if (!light) {
    return (
      <WidgetPlaceholder
        title={customTitle || entityId}
        message="Entity unavailable"
        dashed
      />
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
  const lightStatus = light.isOn
    ? light.supportsBrightness
      ? `${Math.max(1, brightness.value)}%`
      : "On"
    : "Off";
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
              if (chip) {
                void (light.isOn ? light.turnOff() : light.turnOn());
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
                if (chip) {
                  void (light.isOn ? light.turnOff() : light.turnOn());
                  return;
                }
                openDetail();
              }
            }
          : undefined
      }
      className={
        chip
          ? `${chipShellClass} text-left motion-safe:transition-[border-color,box-shadow] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] ${
              light.isOn ? "border-primary/30 bg-primary/15" : "border-border bg-card hover:border-primary/30"
            }`
          : `${cardShellClass} border border-border bg-card text-left text-card-foreground shadow-sm motion-safe:transition-[border-color,box-shadow] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] ${
              compact ? "gap-3 p-4" : "gap-4 p-5"
            } ${light.isOn ? "" : "hover:border-primary/30"}`
      }
      style={chip ? undefined : wash.surfaceStyle}
    >
      {chip ? (
        <ChipFace
          title={displayTitle}
          status={groupStatus ?? lightStatus}
          icon={Lightbulb}
          active={light.isOn}
        />
      ) : (
      <>
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
          {groupStatus ? (
            <p className="mt-1 text-sm" style={{ color: wash.inkMuted }}>
              {groupStatus}
              {light.supportsBrightness
                ? ` - ${light.isOn ? brightness.value : 0}%`
                : ""}
            </p>
          ) : null}
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

      {light.supportsBrightness && !tight ? (
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
      </>
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
  defaultSize: { w: 4, h: 2, minW: 2, minH: 1, maxW: 8, maxH: 6 },
  minSize: { w: 1, h: 1 },
  maxSize: { w: 8, h: 6 },
  entityDomains: ["light"],
  capabilities: ["entity.read", "service.call"],
});
