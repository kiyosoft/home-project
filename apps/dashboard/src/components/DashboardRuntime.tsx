import { useEffect, useRef, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { AssistHost } from "@/components/AssistHost";
import { CommandPalette } from "@/components/CommandPalette";
import { DashboardGrid } from "@/components/DashboardGrid";
import { PageDock } from "@/components/PageDock";
import { PinDialog } from "@/components/PinDialog";
import { PluginsDialog } from "@/components/PluginsDialog";
import { WidgetPicker } from "@/components/WidgetPicker";
import { WidgetSettingsDialog } from "@/components/WidgetSettingsDialog";
import type { Breakpoint } from "@/dashboard/types";
import { breakpointFromWidth } from "@/dashboard/types";
import { useLongPress } from "@/hooks/useLongPress";
import { t } from "@/i18n";
import { setHassParentKiosk } from "@/lib/hass-parent-kiosk";
import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";

export function DashboardRuntime() {
  const haMode = useHaStore((state) => state.mode);
  const locale = useLocaleStore((state) => state.locale);

  const dashboard = useDashboardStore((state) => state.dashboard);
  const activePageId = useDashboardStore((state) => state.activePageId);
  const editorMode = useDashboardStore((state) => state.mode);
  const kiosk = useDashboardStore((state) => state.kiosk);
  const banner = useDashboardStore((state) => state.banner);
  const exitKiosk = useDashboardStore((state) => state.exitKiosk);
  const setBanner = useDashboardStore((state) => state.setBanner);

  const [breakpoint, setBreakpoint] = useState<Breakpoint>("lg");
  const gridHostRef = useRef<HTMLElement>(null);
  const page = dashboard?.pages.find((p) => p.id === activePageId);

  useEffect(() => {
    const el = gridHostRef.current;
    if (!el) return;

    const update = () => setBreakpoint(breakpointFromWidth(el.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [page?.id]);

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
    if (!kiosk) return;
    setHassParentKiosk(true);
    return () => setHassParentKiosk(false);
  }, [kiosk]);

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

  if (!dashboard || !page) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        {t(locale, "app.preparing")}
      </div>
    );
  }

  const help =
    editorMode === "edit"
      ? t(locale, "runtime.editHelp")
      : haMode === "demo"
        ? t(locale, "runtime.demoHelp")
        : t(locale, "runtime.liveHelp");

  return (
    <div
      className="min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom,0px))]"
      {...(kiosk ? canvasLongPress : {})}
    >
      <div className="dashboard-shell">
        <AppHeader showDisconnect showBuilder />

        <main ref={gridHostRef} className="w-full">
          {banner ? (
            <div className="mb-[var(--dash-gap)] rounded-xl border border-border bg-muted px-3 py-2 text-sm">
              {banner}
            </div>
          ) : null}

          {!kiosk ? (
            <p className="mb-2 text-sm text-muted-foreground">{help}</p>
          ) : null}

          <DashboardGrid page={page} />
        </main>
      </div>

      <PageDock />
      <WidgetPicker breakpoint={breakpoint} />
      <WidgetSettingsDialog />
      <PluginsDialog />
      <PinDialog />
      <CommandPalette />
      <AssistHost />
    </div>
  );
}
