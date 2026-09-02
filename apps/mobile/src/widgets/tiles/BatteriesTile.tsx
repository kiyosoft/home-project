import { discoverBatteries, stringList } from "@ethio/ha-sdk";
import { useMemo } from "react";

import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { readString, type WidgetBodyProps } from "@/widgets/types";
import { WidgetTile } from "@/widgets/WidgetTile";

export function BatteriesTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const customTitle = readString(config, "title").trim();
  const entityIds = config.entity_ids;
  const configured = useMemo(() => stringList(entityIds), [entityIds]);
  const entities = useHaStore((state) => state.entities);
  const report = useMemo(
    () =>
      discoverBatteries(
        entities,
        configured.length > 0 ? configured : undefined,
      ),
    [entities, configured],
  );
  const ok = report.total > 0 && report.low === 0;
  const status =
    report.total === 0
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
    />
  );
}
