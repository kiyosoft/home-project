import { useMemo, useRef, useState } from "react";
import {
  ResponsiveGridLayout,
  useContainerWidth,
  verticalCompactor,
  type Layout,
} from "react-grid-layout";

import { WidgetTile } from "@/components/WidgetTile";
import type { Breakpoint, DashboardPage, GridItem } from "@/dashboard/types";
import { BREAKPOINTS, COLS } from "@/dashboard/types";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboard-store";

import "react-grid-layout/css/styles.css";

interface DashboardGridProps {
  page: DashboardPage;
}

function toLayouts(page: DashboardPage) {
  return {
    lg: page.layouts.lg,
    md: page.layouts.md,
    sm: page.layouts.sm,
  };
}

function asGridItems(layout: Layout): GridItem[] {
  return layout.map((item) => ({
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.minW,
    minH: item.minH,
    maxW: item.maxW,
    maxH: item.maxH,
  }));
}

export function DashboardGrid({ page }: DashboardGridProps) {
  const mode = useDashboardStore((state) => state.mode);
  const setLayouts = useDashboardStore((state) => state.setLayouts);
  const { width, containerRef, mounted } = useContainerWidth();
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("lg");
  const interacting = useRef(false);

  const layouts = useMemo(() => toLayouts(page), [page]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "min-h-[50vh] w-full",
        mode === "edit" &&
          "rounded-2xl bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_55%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_55%,transparent)_1px,transparent_1px)] bg-size-[24px_24px]",
      )}
    >
      {mounted ? (
        <ResponsiveGridLayout
          className="layout"
          width={width}
          layouts={layouts}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={56}
          margin={[12, 12] as const}
          containerPadding={[0, 0] as const}
          compactor={verticalCompactor}
          dragConfig={{
            enabled: mode === "edit",
            cancel: ".ethio-no-drag",
          }}
          resizeConfig={{
            enabled: mode === "edit",
          }}
          onBreakpointChange={(bp) => {
            setBreakpoint(bp as Breakpoint);
          }}
          onDragStart={() => {
            interacting.current = true;
          }}
          onResizeStart={() => {
            interacting.current = true;
          }}
          onDragStop={(layout) => {
            interacting.current = false;
            if (mode === "edit") {
              setLayouts(breakpoint, asGridItems(layout));
            }
          }}
          onResizeStop={(layout) => {
            interacting.current = false;
            if (mode === "edit") {
              setLayouts(breakpoint, asGridItems(layout));
            }
          }}
          onLayoutChange={(layout) => {
            if (mode === "edit" && interacting.current) {
              setLayouts(breakpoint, asGridItems(layout));
            }
          }}
        >
          {page.widgets.map((widget) => (
            <div key={widget.id} className="overflow-hidden">
              <WidgetTile widget={widget} />
            </div>
          ))}
        </ResponsiveGridLayout>
      ) : null}
    </div>
  );
}
