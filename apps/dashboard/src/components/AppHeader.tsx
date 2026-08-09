import {
  Check,
  Download,
  LogOut,
  Pencil,
  Plus,
  Settings,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ConnectionStatusChip } from "@/components/ConnectionStatusChip";
import { DashboardSettings } from "@/components/DashboardSettings";
import { ThemeChooser } from "@/components/ThemeChooser";
import { Button } from "@/components/ui/button";
import { useClock } from "@/hooks/useClock";
import { t } from "@/i18n";
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
  const status = useHaStore((state) => state.status);
  const mode = useHaStore((state) => state.mode);
  const error = useHaStore((state) => state.error);
  const reconnect = useHaStore((state) => state.reconnect);
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
  const now = useClock();

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
  const showToolbar = showBuilder && !kiosk;
  const showHero = showTitle || showDate || showTime;

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
      <header className="mx-auto w-full max-w-6xl px-4 pt-8 pb-3 sm:px-6 sm:pt-10">
          {showHero ? (
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {showTitle ? (
                  <h1 className="font-sans text-3xl font-semibold uppercase tracking-[0.08em] text-foreground sm:text-4xl md:text-[2.75rem] md:leading-none">
                    {title}
                  </h1>
                ) : null}
                {showDate ? (
                  <p
                    className={`text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-sm ${
                      showTitle ? "mt-2" : ""
                    }`}
                  >
                    {formatHeaderDate(now, locale)}
                  </p>
                ) : null}
              </div>
              {showTime ? (
                <time
                  dateTime={now.toISOString()}
                  className="shrink-0 font-sans text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl md:text-[2.75rem] md:leading-none"
                >
                  {formatHeaderTime(now, timeFormat, locale)}
                </time>
              ) : null}
            </div>
          ) : null}

          {showToolbar || showDisconnect ? (
            <div
              className={`flex flex-wrap items-center justify-end gap-2 ${
                showHero ? "mt-4" : ""
              }`}
            >
              <ConnectionStatusChip
                status={status}
                mode={mode}
                error={error}
                onReconnect={() => {
                  void reconnect();
                }}
              />
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
