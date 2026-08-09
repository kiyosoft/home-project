import { useEffect, useRef, useState } from "react";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { TimeFormat } from "@/dashboard/types";
import { t } from "@/i18n";
import { useDashboardStore } from "@/store/dashboard-store";
import { useLocaleStore } from "@/store/locale-store";
import { usePluginsUiStore } from "@/store/plugins-ui-store";

interface DashboardSettingsProps {
  open: boolean;
  onClose: () => void;
}

export function DashboardSettings({ open, onClose }: DashboardSettingsProps) {
  const locale = useLocaleStore((state) => state.locale);
  const pinHash = useDashboardStore((state) => state.pinHash);
  const kiosk = useDashboardStore((state) => state.kiosk);
  const dashboard = useDashboardStore((state) => state.dashboard);
  const unlocked = useDashboardStore((state) => state.unlocked);
  const openPinDialog = useDashboardStore((state) => state.openPinDialog);
  const clearPin = useDashboardStore((state) => state.clearPin);
  const setKiosk = useDashboardStore((state) => state.setKiosk);
  const setCardsOnly = useDashboardStore((state) => state.setCardsOnly);
  const setDashboardTitle = useDashboardStore((state) => state.setDashboardTitle);
  const updateHeader = useDashboardStore((state) => state.updateHeader);
  const exportJSON = useDashboardStore((state) => state.exportJSON);
  const importJSON = useDashboardStore((state) => state.importJSON);
  const setBanner = useDashboardStore((state) => state.setBanner);
  const openPlugins = usePluginsUiStore((state) => state.openPlugins);

  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState(dashboard?.title ?? "");

  useEffect(() => {
    if (open) setTitleDraft(dashboard?.title ?? "");
  }, [open, dashboard?.title]);

  const header = dashboard?.header;
  const showTitle = header?.showTitle !== false;
  const showDate = header?.showDate !== false;
  const showTime = header?.showTime !== false;
  const timeFormat: TimeFormat =
    header?.timeFormat === "12h" ? "12h" : "24h";

  function ensureUnlocked(): boolean {
    if (pinHash && !unlocked) {
      openPinDialog("settings");
      return false;
    }
    return true;
  }

  function handleExport() {
    const json = exportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${dashboard?.id ?? "dashboard"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t(locale, "settings.title")}
      description={t(locale, "settings.description")}
    >
      <div className="space-y-6 text-sm">
        <section className="space-y-3">
          <h3 className="font-medium">{t(locale, "settings.language")}</h3>
          <p className="text-muted-foreground">
            {t(locale, "settings.languageHint")}
          </p>
          <LanguageSwitcher />
        </section>

        <section className="space-y-3">
          <h3 className="font-medium">{t(locale, "settings.header")}</h3>
          <p className="text-muted-foreground">
            {t(locale, "settings.headerHint")}
          </p>
          <label className="block space-y-2">
            <span className="font-medium">{t(locale, "settings.titleLabel")}</span>
            <Input
              value={titleDraft}
              placeholder={t(locale, "settings.titlePlaceholder")}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={() => {
                if (!ensureUnlocked() && pinHash) return;
                setDashboardTitle(titleDraft);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
            />
          </label>
          <div className="space-y-2">
            <label className="flex items-center justify-between gap-3">
              <span>{t(locale, "settings.showTitle")}</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={showTitle}
                onChange={(event) => {
                  if (!ensureUnlocked() && pinHash) return;
                  updateHeader({ showTitle: event.target.checked });
                }}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>{t(locale, "settings.showDate")}</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={showDate}
                onChange={(event) => {
                  if (!ensureUnlocked() && pinHash) return;
                  updateHeader({ showDate: event.target.checked });
                }}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>{t(locale, "settings.showTime")}</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={showTime}
                onChange={(event) => {
                  if (!ensureUnlocked() && pinHash) return;
                  updateHeader({ showTime: event.target.checked });
                }}
              />
            </label>
          </div>
          <label className="block space-y-2">
            <span className="font-medium">{t(locale, "settings.timeFormat")}</span>
            <select
              className="flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
              value={timeFormat}
              disabled={!showTime}
              onChange={(event) => {
                if (!ensureUnlocked() && pinHash) return;
                updateHeader({
                  timeFormat: event.target.value as TimeFormat,
                });
              }}
            >
              <option value="24h">{t(locale, "settings.time24h")}</option>
              <option value="12h">{t(locale, "settings.time12h")}</option>
            </select>
          </label>
        </section>

        <section className="space-y-2">
          <h3 className="font-medium">{t(locale, "settings.plugins")}</h3>
          <p className="text-muted-foreground">
            {t(locale, "settings.pluginsHint")}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              onClose();
              openPlugins();
            }}
          >
            {t(locale, "settings.browseRegistry")}
          </Button>
        </section>

        <section className="space-y-2">
          <h3 className="font-medium">{t(locale, "settings.pinLock")}</h3>
          <p className="text-muted-foreground">
            {pinHash
              ? t(locale, "settings.pinSet")
              : t(locale, "settings.pinUnset")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (!ensureUnlocked() && pinHash) return;
                openPinDialog("set-pin");
              }}
            >
              {pinHash
                ? t(locale, "settings.changePin")
                : t(locale, "settings.setPin")}
            </Button>
            {pinHash ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!ensureUnlocked()) return;
                  clearPin();
                }}
              >
                {t(locale, "settings.clearPin")}
              </Button>
            ) : null}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="font-medium">{t(locale, "settings.kiosk")}</h3>
          <p className="text-muted-foreground">
            {t(locale, "settings.kioskHint")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={kiosk ? "default" : "secondary"}
              size="sm"
              onClick={() => setKiosk(!kiosk)}
            >
              {kiosk
                ? t(locale, "settings.kioskOn")
                : t(locale, "settings.enableKiosk")}
            </Button>
            <Button
              variant={dashboard?.cardsOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setCardsOnly(!dashboard?.cardsOnly)}
            >
              {t(locale, "settings.cardsOnly")}
            </Button>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="font-medium">{t(locale, "settings.importExport")}</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={handleExport}>
              {t(locale, "settings.exportJson")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              {t(locale, "settings.importJson")}
            </Button>
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
                    if (!result.ok) {
                      setImportError(result.error);
                      setBanner(result.error);
                      return;
                    }
                    setImportError(null);
                    setBanner(t(locale, "header.imported"));
                    onClose();
                  } catch (error) {
                    const message =
                      error instanceof Error ? error.message : "Import failed";
                    setImportError(message);
                    setBanner(message);
                  }
                })();
                event.target.value = "";
              }}
            />
          </div>
          {importError ? (
            <p className="text-destructive">{importError}</p>
          ) : null}
        </section>
      </div>
    </Dialog>
  );
}
