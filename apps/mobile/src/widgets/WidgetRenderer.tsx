import type { MobileWidget } from "@ethio/mobile-schema";

import { useT } from "@/store/locale-store";
import { findWidget } from "@/widgets/registry";
import { WidgetTile } from "@/widgets/WidgetTile";

/**
 * Resolves a widget type to its component. An unknown type renders a dead tile
 * rather than disappearing, so a document written by a newer build stays legible.
 */
export function WidgetRenderer({ widget }: { widget: MobileWidget }) {
  const t = useT();
  const def = findWidget(widget.type);

  if (!def) {
    return (
      <WidgetTile
        title={t("widget.unknownType")}
        status={widget.type}
        icon="help-circle-outline"
        size={widget.size ?? "sm"}
        disabled
      />
    );
  }

  const Component = def.component;
  return <Component config={widget.config} size={widget.size ?? def.defaultSize} />;
}
