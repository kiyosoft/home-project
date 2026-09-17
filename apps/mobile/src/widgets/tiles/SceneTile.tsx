import { entityDomain } from "@ethio/ha-sdk";
import { useState } from "react";

import { useT } from "@/store/locale-store";
import type { WidgetBodyProps } from "@/widgets/types";
import { useCallService } from "@/widgets/use-service";
import { useTile } from "@/widgets/use-tile";
import { WidgetTile } from "@/widgets/WidgetTile";

export function SceneTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const callService = useCallService();
  const { entityId, title, unavailable } = useTile(config);
  const [pending, setPending] = useState(false);

  const activate = async () => {
    if (!entityId || unavailable || pending) return;
    setPending(true);
    try {
      await callService(entityDomain(entityId) || "scene", "turn_on", {
        entity_id: entityId,
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <WidgetTile
      title={title || t("widget.section.scenes")}
      status={
        !entityId
          ? t("widget.scene.pick")
          : unavailable
            ? t("widget.state.unavailable")
            : pending
              ? t("widget.scene.activating")
              : t("widget.scene.activate")
      }
      icon="color-palette-outline"
      size={size}
      active={!unavailable && Boolean(entityId)}
      disabled={unavailable || !entityId}
      onPress={() => void activate()}
    />
  );
}
