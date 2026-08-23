import type { MobileWidget } from "@ethio/mobile-schema";
import { tileSpan } from "@ethio/mobile-schema";
import { useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";

import { WidgetRenderer } from "@/widgets/WidgetRenderer";

const GAP = 12;
const COLUMNS = 2;

/**
 * Two-column wrap. Widths come from a measured container rather than the
 * window, so the grid stays correct inside any padding a screen applies.
 */
export function TileGrid({ widgets }: { widgets: MobileWidget[] }) {
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next !== width) setWidth(next);
  };

  const column = (width - GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <View className="flex-row flex-wrap" style={{ gap: GAP }} onLayout={onLayout}>
      {width > 0
        ? widgets.map((widget) => (
            <View
              key={widget.id}
              style={{
                width: tileSpan(widget.size ?? "sm") === 1 ? column : width,
              }}
            >
              <WidgetRenderer widget={widget} />
            </View>
          ))
        : null}
    </View>
  );
}
