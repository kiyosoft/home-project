import { useEntityDetail } from "@ethio/plugin-sdk";
import { Settings2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DashboardWidget } from "@/dashboard/types";
import { useLongPress } from "@/hooks/useLongPress";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboard-store";
import { WidgetRenderer } from "@/widgets/WidgetRenderer";

interface WidgetTileProps {
  widget: DashboardWidget;
}

export function WidgetTile({ widget }: WidgetTileProps) {
  const mode = useDashboardStore((state) => state.mode);
  const removeWidget = useDashboardStore((state) => state.removeWidget);
  const openSettings = useDashboardStore((state) => state.openSettings);
  const entityDetail = useEntityDetail();

  const entityId =
    typeof widget.config.entity_id === "string" ? widget.config.entity_id : "";

  const longPress = useLongPress({
    ms: 500,
    disabled: mode === "edit" || !entityId,
    onLongPress: () => entityDetail.open(entityId),
  });

  return (
    <div
      className={cn(
        "relative h-full min-h-0",
        mode === "edit" && "ring-1 ring-primary/30",
      )}
      {...(mode === "live" ? longPress : {})}
    >
      {mode === "edit" ? (
        <div className="absolute right-2 top-2 z-20 flex gap-1">
          <Button
            variant="secondary"
            size="icon"
            className="ethio-no-drag h-8 w-8"
            aria-label="Configure widget"
            onClick={(event) => {
              event.stopPropagation();
              openSettings(widget.id);
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="ethio-no-drag h-8 w-8"
            aria-label="Remove widget"
            onClick={(event) => {
              event.stopPropagation();
              removeWidget(widget.id);
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}

      <div
        className={cn(
          "h-full",
          mode === "edit" && "pointer-events-none select-none",
        )}
      >
        <WidgetRenderer widget={widget} interactive={mode === "live"} />
      </div>
    </div>
  );
}
