import { Blinds, Lightbulb, Sofa, Thermometer } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { z } from "zod";

import {
  areaCoverStat,
  areaStat,
  areaSummary,
  deriveArea,
  entitiesInArea,
  unanimousService,
} from "@ethio/ha-sdk";
import {
  defineWidget,
  useAreaIndex,
  useCallService,
  useEntities,
  useEntityDetail,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

import { cardShellClass, chipShellClass, cx, useCardDensity } from "../ui";
import { ChipFace } from "./ChipFace";
import { widgetTitle } from "./names";

export const areaConfigSchema = z.object({
  title: z.string().default(""),
  area_id: z.string().min(1, "Area is required"),
});

function stop(event: MouseEvent) {
  event.stopPropagation();
}

function AreaWidget({ config, interactive = true }: WidgetComponentProps) {
  const areaId = typeof config.area_id === "string" ? config.area_id : "";
  const customTitle = widgetTitle(config);
  const { areas, areaByEntity } = useAreaIndex();
  const entities = useEntities();
  const callService = useCallService();
  const entityDetail = useEntityDetail();
  const { ref, compact, tight, chip } = useCardDensity();
  const [pending, setPending] = useState(false);

  const area = areas.find((entry) => entry.area_id === areaId);
  const overview = deriveArea(
    entities,
    areaId ? entitiesInArea(areaByEntity, areaId) : [],
  );
  const title = customTitle || area?.name || "Area";
  const summary = areaSummary(overview, { ideal: "Ideal", empty: "No devices" });
  const {
    lights,
    covers,
    climate,
    current,
    unit,
    lightIds,
    coverIds,
    climateIds,
  } = overview;

  async function runOn(ids: string[], domain: string, service: string) {
    if (!interactive || pending || ids.length === 0) return;
    setPending(true);
    try {
      await Promise.all(
        ids.map((id) => callService(domain, service, { entity_id: id })),
      );
    } finally {
      setPending(false);
    }
  }

  function openClimate() {
    const first = climateIds[0];
    if (!interactive || !first) return;
    entityDetail.open(first);
  }

  return (
    <div
      ref={ref}
      className={cx(
        chip ? chipShellClass : cardShellClass,
        "border-border bg-card text-card-foreground",
        !chip && "border p-4 shadow-sm",
      )}
    >
      {chip ? (
        <ChipFace
          title={title}
          status={summary}
          icon={Sofa}
          active={lights.active > 0}
        />
      ) : (
      <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Area
          </p>
          <h3 className="mt-1 truncate font-display text-lg font-semibold tracking-tight">
            {title}
          </h3>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Sofa className="h-5 w-5" />
        </span>
      </div>
      <p className={cx("mt-2 text-sm text-muted-foreground", compact && "line-clamp-1")}>
        {summary}
      </p>
      {tight ? (
        <p className="mt-auto truncate pt-2 text-xs text-muted-foreground">
          {[
            lights.total > 0 ? `Lights ${areaStat(lights)}` : null,
            current != null ? `${current}${unit}` : null,
            covers.total > 0
              ? `Blinds ${areaCoverStat(covers, { empty: "—", allOpen: "Open" })}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : (
        <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
          <AreaAction
            label="Lights"
            value={areaStat(lights)}
            icon={Lightbulb}
            active={lights.active > 0}
            disabled={!interactive || lightIds.length === 0}
            compact={compact}
            onClick={() =>
              void runOn(
                lightIds,
                "light",
                unanimousService(lights, "turn_on", "turn_off"),
              )
            }
            onPointerDown={stop}
          />
          <AreaAction
            label="Climate"
            value={current != null ? `${current}${unit}` : "—"}
            icon={Thermometer}
            active={Boolean(climate && climate.state !== "off")}
            disabled={!interactive || climateIds.length === 0}
            compact={compact}
            onClick={openClimate}
            onPointerDown={stop}
          />
          <AreaAction
            label="Blinds"
            value={areaCoverStat(covers, { empty: "—", allOpen: "Open" })}
            icon={Blinds}
            active={covers.active > 0}
            disabled={!interactive || coverIds.length === 0}
            compact={compact}
            onClick={() =>
              void runOn(
                coverIds,
                "cover",
                unanimousService(covers, "open_cover", "close_cover"),
              )
            }
            onPointerDown={stop}
          />
        </div>
      )}
      </>
      )}
    </div>
  );
}

function AreaAction({
  label,
  value,
  icon: Icon,
  active,
  disabled,
  onClick,
  onPointerDown,
  compact = false,
}: {
  label: string;
  value: string;
  icon: typeof Lightbulb;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  onPointerDown: (event: MouseEvent) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={onPointerDown}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border px-2 text-center disabled:opacity-40 ${
        compact ? "py-2" : "py-3"
      } ${
        active
          ? "border-primary/30 bg-primary/10"
          : "border-border bg-muted/40"
      }`}
    >
      <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="truncate text-xs font-semibold">{value}</span>
    </button>
  );
}

export const areaWidget = defineWidget({
  id: "@ethio/core/area",
  name: "Area",
  description: "Room overview with lights, climate, and blinds",
  component: AreaWidget,
  configSchema: areaConfigSchema,
  defaultConfig: { title: "", area_id: "" },
  defaultSize: { w: 2, h: 2, minW: 2, minH: 1, maxW: 6, maxH: 6 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 6, h: 6 },
  capabilities: ["entity.read", "service.call"],
});
