import { discoverBatteries, stringList } from "@ethio/ha-sdk";
import { useMemo } from "react";

import { useHaStore, useLiveSession } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { readString, type WidgetBodyProps } from "@/widgets/types";
import { WidgetTile } from "@/widgets/WidgetTile";

export function BatteriesTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const live = useLiveSession();
  const customTitle = readString(config, "title").trim();
  const entityIds = config.entity_ids;
  const configured = useMemo(() => stringList(entityIds), [entityIds]);
  const entities = useHaStore((state) => state.entities);
  const report = useMemo(
    () =>
      discoverBatteries(
        live ? entities : {},
        configured.length > 0 ? configured : undefined,
      ),
    [configured, entities, live],
  );
  const ok = live && report.total > 0 && report.low === 0;
  const status = !live
    ? t("widget.state.unavailable")
    : report.total === 0
      ? t("widget.batteries.none")
      : ok
        ? t("widget.batteries.allGood")
        : t("widget.batteries.low", { count: report.low });

  return (
    <WidgetTile
      title={customTitle || t("widget.batteries.title")}
      status={status}
      icon={ok ? "battery-full" : "battery-dead-outline"}
      size={size}
      active={ok}
      disabled={!live}
    />
  );
}
