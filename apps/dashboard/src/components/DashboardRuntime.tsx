import {
  activeAlerts,
  attentionItems,
  configEntityIds,
  type AttentionItem,
} from "@ethio/ha-sdk";
import { ChevronRight } from "lucide-react";
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
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Breakpoint, DashboardConfig } from "@/dashboard/types";
import { breakpointFromWidth } from "@/dashboard/types";
import { useLongPress } from "@/hooks/useLongPress";
import { t, type Locale, type MessageKey } from "@/i18n";
import { setHassParentKiosk } from "@/lib/hass-parent-kiosk";
import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";

function dashboardWatched(dashboard: DashboardConfig): string[] {
  const ids: string[] = [];
  for (const pill of dashboard.header?.pills ?? []) {
    if (pill.entity_id) ids.push(pill.entity_id);
  }
  for (const page of dashboard.pages) {
    for (const widget of page.widgets) {
      ids.push(...configEntityIds(widget.config));
    }
  }
  return ids;
}

function attentionDetail(item: AttentionItem, locale: Locale): string {
  if (item.kind === "battery" && item.level !== null) {
    return t(locale, "attention.level", { level: item.level });
  }
  const key = `attention.${item.kind}` as MessageKey;
  return t(locale, key);
}

export function DashboardRuntime() {
  const haMode = useHaStore((state) => state.mode);
  const entities = useHaStore((state) => state.entities);
  const callService = useHaStore((state) => state.callService);
  const locale = useLocaleStore((state) => state.locale);
  const alerts = activeAlerts(entities);
  const dashboard = useDashboardStore((state) => state.dashboard);
  const attention = attentionItems(
    entities,
    dashboard ? dashboardWatched(dashboard) : [],
  );
  const activePageId = useDashboardStore((state) => state.activePageId);
  const editorMode = useDashboardStore((state) => state.mode);
  const kiosk = useDashboardStore((state) => state.kiosk);
  const banner = useDashboardStore((state) => state.banner);
  const exitKiosk = useDashboardStore((state) => state.exitKiosk);
  const setBanner = useDashboardStore((state) => state.setBanner);

  const [breakpoint, setBreakpoint] = useState<Breakpoint>("lg");
  const [attentionOpen, setAttentionOpen] = useState(false);
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

  const attentionCount = attention.length + alerts.length;
  const attentionSummary = attention[0]
    ? `${attention[0].name} ${attentionDetail(attention[0], locale)}`
    : (alerts[0]?.name ?? "");
  const attentionExtra =
    attentionCount > 1 ? ` · +${attentionCount - 1}` : "";
  const attentionCountLabel =
    attentionCount === 1
      ? t(locale, "attention.countOne")
      : t(locale, "attention.count", { count: attentionCount });

  return (
    <div
      className="min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom,0px))]"
      {...(kiosk ? canvasLongPress : {})}
    >
      <div className="dashboard-shell">
        <AppHeader showDisconnect showBuilder />

        <main ref={gridHostRef} className="w-full">
          {attentionCount > 0 ? (
            <button
              type="button"
              className="mb-[var(--dash-gap)] flex w-full items-center gap-3 rounded-xl border border-border bg-muted px-3 py-2 text-left text-sm"
              aria-label={t(locale, "attention.open", {
                count: attentionCountLabel,
              })}
              onClick={() => setAttentionOpen(true)}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-muted-foreground">
                  {t(locale, "attention.section")}
                </span>
                <span className="block truncate font-medium">
                  {attentionSummary}
                  {attentionExtra}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {attentionCountLabel}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ) : null}

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

      <Dialog
        open={attentionOpen}
        onClose={() => setAttentionOpen(false)}
        title={t(locale, "attention.section")}
        description={attentionCountLabel}
      >
        <div className="space-y-3">
          {attention.map((item) => (
            <div key={item.entityId}>
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">
                {attentionDetail(item, locale)}
              </p>
            </div>
          ))}
          {alerts.map((alert) => (
            <div
              key={alert.entityId}
              className="flex items-center justify-between gap-3"
            >
              <p className="text-sm font-medium">{alert.name}</p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  void callService("alert", "turn_off", {
                    entity_id: alert.entityId,
                  }).catch(() => {
                    // HA keeps the entity on; the row stays.
                  });
                }}
              >
                {t(locale, "alert.acknowledge")}
              </Button>
            </div>
          ))}
        </div>
      </Dialog>
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
