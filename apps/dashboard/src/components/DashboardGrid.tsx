import { useAnimationControls, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ResponsiveGridLayout,
  useContainerWidth,
  verticalCompactor,
  type Layout,
} from "react-grid-layout";

import { WidgetTile } from "@/components/WidgetTile";
import type { Breakpoint, DashboardPage, GridItem } from "@/dashboard/types";
import { BREAKPOINTS, COLS, DASH_GAP } from "@/dashboard/types";
import { useCardReveal } from "@/hooks/useCardReveal";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboard-store";

import "react-grid-layout/css/styles.css";

const REVEAL_STAGGER_S = 0.04;
const REVEAL_STAGGER_MAX = 12;
const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;

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

/** Replay entrance without remounting children (avoids re-running heavy widgets). */
function CardReveal({
  revealKey,
  order,
  reduceMotion,
  children,
}: {
  revealKey: number;
  order: number;
  reduceMotion: boolean | null;
  children: ReactNode;
}) {
  const controls = useAnimationControls();
  const delay = Math.min(order, REVEAL_STAGGER_MAX) * REVEAL_STAGGER_S;

  useEffect(() => {
    if (reduceMotion) {
      void controls.set({ opacity: 1, y: 0, scale: 1 });
      return;
    }
    // Replay on page change / wake without remounting widget trees
    void controls.set({ opacity: 0, y: 12, scale: 0.985 });
    void controls.start({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        delay,
        ease: REVEAL_EASE,
      },
    });
  }, [revealKey, delay, reduceMotion, controls]);

  return (
    <m.div
      className="h-full"
      initial={
        reduceMotion ? false : { opacity: 0, y: 12, scale: 0.985 }
      }
      animate={controls}
    >
      {children}
    </m.div>
  );
}

export function DashboardGrid({ page }: DashboardGridProps) {
  const mode = useDashboardStore((state) => state.mode);
  const setLayouts = useDashboardStore((state) => state.setLayouts);
  const { width, containerRef, mounted } = useContainerWidth();
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("lg");
  const interacting = useRef(false);
  const revealKey = useCardReveal(page.id);
  const reduceMotion = useReducedMotion();

  const layouts = useMemo(() => toLayouts(page), [page]);

  // Stagger by visual reading order, not widgets[] registration order.
  const revealOrder = useMemo(() => {
    const layout = page.layouts[breakpoint] ?? page.layouts.lg;
    const sorted = [...layout].sort((a, b) => a.y - b.y || a.x - b.x);
    return new Map(sorted.map((item, index) => [item.i, index]));
  }, [page.layouts, breakpoint]);

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
          margin={[DASH_GAP, DASH_GAP] as const}
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
          {page.widgets.map((widget, index) => {
            const order = revealOrder.get(widget.id) ?? index;
            return (
              <div key={widget.id} className="overflow-visible">
                <CardReveal
                  revealKey={revealKey}
                  order={order}
                  reduceMotion={reduceMotion}
                >
                  <WidgetTile widget={widget} />
                </CardReveal>
              </div>
            );
          })}
        </ResponsiveGridLayout>
      ) : null}
    </div>
  );
}
