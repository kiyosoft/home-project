import {
  Check,
  Download,
  Lightbulb,
  LogOut,
  Pencil,
  Plus,
  Settings,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { countLightsOn } from "@ethio/ha-sdk";

import { DashboardSettings } from "@/components/DashboardSettings";
import { HeaderPills } from "@/components/HeaderPills";
import { ThemeChooser } from "@/components/ThemeChooser";
import { Button } from "@/components/ui/button";
import type { TimeFormat } from "@/dashboard/types";
import { useClock } from "@/hooks/useClock";
import { useArrivalWelcome } from "@/hooks/useArrivalWelcome";
import { t, type Locale, type MessageKey } from "@/i18n";
import { formatHeaderDate, formatHeaderTime } from "@/lib/header-format";
import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";

interface AppHeaderProps {
  showDisconnect?: boolean;
  /** Show edit / import / settings builder controls */
  showBuilder?: boolean;
}

export function AppHeader({
  showDisconnect = false,
  showBuilder = false,
}: AppHeaderProps) {
  const disconnect = useHaStore((state) => state.disconnect);
  const locale = useLocaleStore((state) => state.locale);

  const editorMode = useDashboardStore((state) => state.mode);
  const kiosk = useDashboardStore((state) => state.kiosk);
  const requestEdit = useDashboardStore((state) => state.requestEdit);
  const setMode = useDashboardStore((state) => state.setMode);
  const openPicker = useDashboardStore((state) => state.openPicker);
  const exportJSON = useDashboardStore((state) => state.exportJSON);
  const importJSON = useDashboardStore((state) => state.importJSON);
  const setBanner = useDashboardStore((state) => state.setBanner);
  const dashboard = useDashboardStore((state) => state.dashboard);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onOpenSettings = () => setSettingsOpen(true);
    window.addEventListener("ethio:open-settings", onOpenSettings);
    return () =>
      window.removeEventListener("ethio:open-settings", onOpenSettings);
  }, []);

  const header = dashboard?.header;
  const hasDashboard = Boolean(dashboard);
  const showTitle = hasDashboard ? header?.showTitle !== false : true;
  const showDate = hasDashboard ? header?.showDate !== false : false;
  const showTime = hasDashboard ? header?.showTime !== false : false;
  const timeFormat = header?.timeFormat === "12h" ? "12h" : "24h";
  const title = dashboard?.title ?? "Ethio Home";
  const pills = header?.pills ?? [];
  const canAddPills = showBuilder && !kiosk;
  const showToolbar = showBuilder && !kiosk;
  const arrival = useArrivalWelcome();
  const showWelcome = arrival.arrived && Boolean(arrival.name);
  const showHero =
    showTitle ||
    showDate ||
    showTime ||
    pills.length > 0 ||
    canAddPills ||
    showWelcome;

  if (!showHero && !showToolbar && !showDisconnect) {
    return showBuilder ? (
      <>
        <DashboardSettings
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      </>
    ) : null;
  }

  return (
    <>
      <header className="w-full pb-[var(--dash-gap)]">
        {showHero ? (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {showTitle ? (
                <h1 className="font-sans text-3xl font-semibold uppercase tracking-[0.08em] text-foreground sm:text-4xl md:text-[2.75rem] md:leading-none">
                  {title}
                </h1>
              ) : null}
              <HeaderGreeting locale={locale} />
              {showDate ? (
                <HeaderDate locale={locale} spaced />
              ) : null}
              {showWelcome ? (
                <p
                  className={`text-lg text-muted-foreground sm:text-xl ${
                    showTitle || showDate ? "mt-2" : ""
                  }`}
                >
                  {t(locale, "header.welcomeHome", { name: arrival.name })}
                </p>
              ) : null}
              <HeaderPills pills={pills} canAdd={canAddPills} />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {showTime ? (
                <HeaderTime locale={locale} timeFormat={timeFormat} />
              ) : null}
              <LightsChip locale={locale} />
            </div>
          </div>
        ) : null}

        {showToolbar || showDisconnect ? (
          <div
            className={`flex flex-wrap items-center justify-end gap-2 ${
              showHero ? "mt-4" : ""
            }`}
          >
            {showToolbar ? <ThemeChooser /> : null}

            {showToolbar ? (
              editorMode === "edit" ? (
                <>
                  <Button variant="secondary" size="sm" onClick={openPicker}>
                    <Plus className="h-4 w-4" />
                    {t(locale, "header.add")}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={t(locale, "header.exportAria")}
                    onClick={() => {
                      const json = exportJSON();
                      const blob = new Blob([json], {
                        type: "application/json",
                      });
                      const url = URL.createObjectURL(blob);
                      const anchor = document.createElement("a");
                      anchor.href = url;
                      anchor.download = `${dashboard?.id ?? "dashboard"}.json`;
                      anchor.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={t(locale, "header.importAria")}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setMode("live")}
                  >
                    <Check className="h-4 w-4" />
                    {t(locale, "header.done")}
                  </Button>
                </>
              ) : (
                <Button variant="secondary" size="sm" onClick={requestEdit}>
                  <Pencil className="h-4 w-4" />
                  {t(locale, "header.edit")}
                </Button>
              )
            ) : null}

            {showToolbar ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t(locale, "header.settingsAria")}
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            ) : null}

            {showDisconnect && !kiosk ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnect({ clearSaved: true })}
              >
                <LogOut className="h-4 w-4" />
                {t(locale, "header.disconnect")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      {showBuilder ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void (async () => {
                try {
                  const text = await file.text();
                  const result = importJSON(text);
                  setBanner(
                    result.ok ? t(locale, "header.imported") : result.error,
                  );
                } catch (error) {
                  setBanner(
                    error instanceof Error ? error.message : "Import failed",
                  );
                }
              })();
              event.target.value = "";
            }}
          />
          <DashboardSettings
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        </>
      ) : null}
    </>
  );
}

function greetingKey(hour: number): MessageKey {
  if (hour < 12) return "header.greetingMorning";
  if (hour < 18) return "header.greetingAfternoon";
  return "header.greetingEvening";
}

function LightsChip({ locale }: { locale: Locale }) {
  const entities = useHaStore((state) => state.entities);
  const count = useMemo(() => countLightsOn(entities), [entities]);
  if (count <= 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-200"
      aria-label={t(locale, "header.lightsChipAria")}
    >
      <Lightbulb className="h-3.5 w-3.5" />
      {count === 1
        ? t(locale, "header.lightsOnOne")
        : t(locale, "header.lightsOn", { count })}
    </span>
  );
}

function HeaderDate({ locale, spaced }: { locale: Locale; spaced: boolean }) {
  const now = useClock();
  return (
    <p
      className={`text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-sm ${
        spaced ? "mt-2" : ""
      }`}
    >
      {formatHeaderDate(now, locale)}
    </p>
  );
}

function HeaderTime({
  locale,
  timeFormat,
}: {
  locale: Locale;
  timeFormat: TimeFormat;
}) {
  const now = useClock();
  return (
    <time
      dateTime={now.toISOString()}
      className="shrink-0 font-sans text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl md:text-[2.75rem] md:leading-none"
    >
      {formatHeaderTime(now, timeFormat, locale)}
    </time>
  );
}

function HeaderGreeting({ locale }: { locale: Locale }) {
  const now = useClock();
  const weekday = now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  return (
    <p className="mt-2 text-sm text-muted-foreground">
      {t(locale, greetingKey(now.getHours()))} · {weekday}
    </p>
  );
}
