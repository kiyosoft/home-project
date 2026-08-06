import { useEffect, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { CommandPalette } from "@/components/CommandPalette";
import { DashboardGrid } from "@/components/DashboardGrid";
import { PageDock } from "@/components/PageDock";
import { PinDialog } from "@/components/PinDialog";
import { PluginsDialog } from "@/components/PluginsDialog";
import { WidgetPicker } from "@/components/WidgetPicker";
import { WidgetSettingsDialog } from "@/components/WidgetSettingsDialog";
import type { Breakpoint } from "@/dashboard/types";
import { BREAKPOINTS } from "@/dashboard/types";
import { useLongPress } from "@/hooks/useLongPress";
import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";

function breakpointFromWidth(width: number): Breakpoint {
  if (width >= BREAKPOINTS.lg) return "lg";
  if (width >= BREAKPOINTS.md) return "md";
  return "sm";
}

export function DashboardRuntime() {
  const haMode = useHaStore((state) => state.mode);

  const dashboard = useDashboardStore((state) => state.dashboard);
  const activePageId = useDashboardStore((state) => state.activePageId);
  const editorMode = useDashboardStore((state) => state.mode);
  const kiosk = useDashboardStore((state) => state.kiosk);
  const banner = useDashboardStore((state) => state.banner);
  const exitKiosk = useDashboardStore((state) => state.exitKiosk);
  const setBanner = useDashboardStore((state) => state.setBanner);

  const [breakpoint, setBreakpoint] = useState<Breakpoint>("lg");

  useEffect(() => {
    const onResize = () =>
      setBreakpoint(breakpointFromWidth(window.innerWidth));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && kiosk) {
        exitKiosk();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [kiosk, exitKiosk]);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 3200);
    return () => clearTimeout(timer);
  }, [banner, setBanner]);

  const canvasLongPress = useLongPress({
    ms: 700,
    disabled: !kiosk,
    onLongPress: () => exitKiosk(),
  });

  const page = dashboard?.pages.find((p) => p.id === activePageId);

  if (!dashboard || !page) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Preparing dashboard…
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" {...(kiosk ? canvasLongPress : {})}>
      <AppHeader showDisconnect showBuilder />

      <main className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
        {banner ? (
          <div className="mb-4 rounded-xl border border-border bg-muted px-3 py-2 text-sm">
            {banner}
          </div>
        ) : null}

        {!kiosk ? (
          <div className="mb-5 mt-1">
            <p className="text-sm text-muted-foreground">
              {editorMode === "edit"
                ? "Edit mode — drag, resize, add, and configure widgets. Changes autosave."
                : haMode === "demo"
                  ? "Demo entities update live. Tap sensors for details; toggles act on tap; long-press any entity tile for the full attribute sheet."
                  : "Live entities from your Home Assistant instance. Tap sensors for details; long-press any entity tile for attributes."}
            </p>
          </div>
        ) : (
          <div className="mb-4" />
        )}

        <DashboardGrid page={page} />
      </main>

      <PageDock />
      <WidgetPicker breakpoint={breakpoint} />
      <WidgetSettingsDialog />
      <PluginsDialog />
      <PinDialog />
      <CommandPalette />
    </div>
  );
}
