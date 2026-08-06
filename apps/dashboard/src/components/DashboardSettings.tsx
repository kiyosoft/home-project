import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { TimeFormat } from "@/dashboard/types";
import { useDashboardStore } from "@/store/dashboard-store";
import { usePluginsUiStore } from "@/store/plugins-ui-store";

interface DashboardSettingsProps {
  open: boolean;
  onClose: () => void;
}

export function DashboardSettings({ open, onClose }: DashboardSettingsProps) {
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
      title="Dashboard settings"
      description="Header, PIN, kiosk, and import/export."
    >
      <div className="space-y-6 text-sm">
        <section className="space-y-3">
          <h3 className="font-medium">Header</h3>
          <p className="text-muted-foreground">
            Tunet-style title, date, and clock. Visible in kiosk mode.
          </p>
          <label className="block space-y-2">
            <span className="font-medium">Title</span>
            <Input
              value={titleDraft}
              placeholder="My Home"
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
              <span>Show title</span>
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
              <span>Show date</span>
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
              <span>Show time</span>
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
            <span className="font-medium">Time format</span>
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
              <option value="24h">24-hour (19:53)</option>
              <option value="12h">12-hour (7:53 PM)</option>
            </select>
          </label>
        </section>

        <section className="space-y-2">
          <h3 className="font-medium">Plugins</h3>
          <p className="text-muted-foreground">
            Install open-registry widgets dynamically (no app rebuild).
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              onClose();
              openPlugins();
            }}
          >
            Browse registry
          </Button>
        </section>

        <section className="space-y-2">
          <h3 className="font-medium">PIN lock</h3>
          <p className="text-muted-foreground">
            {pinHash
              ? "PIN is set. Required to enter edit mode."
              : "No PIN set."}
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
              {pinHash ? "Change PIN" : "Set PIN"}
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
                Clear PIN
              </Button>
            ) : null}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="font-medium">Kiosk</h3>
          <p className="text-muted-foreground">
            Hide edit chrome for wall tablets. Exit with Esc or long-press empty
            canvas. Header and page switcher stay available.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={kiosk ? "default" : "secondary"}
              size="sm"
              onClick={() => setKiosk(!kiosk)}
            >
              {kiosk ? "Kiosk on" : "Enable kiosk"}
            </Button>
            <Button
              variant={dashboard?.cardsOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setCardsOnly(!dashboard?.cardsOnly)}
            >
              Cards only
            </Button>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="font-medium">Import / export</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={handleExport}>
              Export JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              Import JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void file.text().then((text) => {
                  const result = importJSON(text);
                  if (!result.ok) {
                    setImportError(result.error);
                    setBanner(result.error);
                    return;
                  }
                  setImportError(null);
                  setBanner("Dashboard imported");
                  onClose();
                });
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
