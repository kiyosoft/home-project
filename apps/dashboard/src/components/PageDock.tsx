import {
  Bed,
  CloudSun,
  Home,
  Plus,
  Settings,
  Trash2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboard-store";
import { useLocaleStore } from "@/store/locale-store";

function pageIcon(id: string, title: string): LucideIcon {
  const key = `${id} ${title}`.toLowerCase();
  if (key.includes("bed")) return Bed;
  if (key.includes("energy") || key.includes("power")) return Zap;
  if (key.includes("environ") || key.includes("weather")) return CloudSun;
  return Home;
}

export function PageDock() {
  const locale = useLocaleStore((state) => state.locale);
  const dashboard = useDashboardStore((state) => state.dashboard);
  const activePageId = useDashboardStore((state) => state.activePageId);
  const mode = useDashboardStore((state) => state.mode);
  const kiosk = useDashboardStore((state) => state.kiosk);
  const setActivePage = useDashboardStore((state) => state.setActivePage);
  const addPage = useDashboardStore((state) => state.addPage);
  const renamePage = useDashboardStore((state) => state.renamePage);
  const removePage = useDashboardStore((state) => state.removePage);

  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  if (!dashboard) return null;

  // Page switching stays available in kiosk (including cards-only).
  // Edit chrome (add / delete / rename) only in edit mode.
  const canEditPages = mode === "edit" && !kiosk;

  const renaming = dashboard.pages.find((p) => p.id === renameId);

  return (
    <>
      <nav className="page-dock pointer-events-none fixed inset-x-0 z-40 flex justify-center">
        <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-border bg-card/95 px-2 py-2 shadow-lg backdrop-blur">
          {dashboard.pages.map((page) => {
            const active = page.id === activePageId;
            const Icon = pageIcon(page.id, page.title);
            return (
              <button
                key={page.id}
                type="button"
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full transition-colors sm:h-auto sm:w-auto sm:rounded-xl sm:px-3 sm:py-2",
                  active
                    ? "bg-primary/20 text-primary shadow-[0_0_16px_color-mix(in_srgb,var(--primary)_35%,transparent)]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                onClick={() => setActivePage(page.id)}
                onDoubleClick={() => {
                  if (!canEditPages) return;
                  setRenameId(page.id);
                  setRenameValue(page.title);
                }}
                aria-label={page.title}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" />
                <span className="ml-2 hidden text-sm font-medium sm:inline">
                  {page.title}
                </span>
              </button>
            );
          })}

          {canEditPages ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                aria-label={t(locale, "page.addAria")}
                onClick={() => addPage()}
              >
                <Plus className="h-4 w-4" />
              </Button>
              {activePageId && dashboard.pages.length > 1 ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-destructive"
                  aria-label={t(locale, "page.deleteAria")}
                  onClick={() => removePage(activePageId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t(locale, "header.settingsAria")}
              onClick={() =>
                window.dispatchEvent(new Event("ethio:open-settings"))
              }
            >
              <Settings className="h-5 w-5" />
            </button>
          )}
        </div>
      </nav>

      <Dialog
        open={Boolean(renaming)}
        onClose={() => setRenameId(null)}
        title={t(locale, "page.renameTitle")}
      >
        <div className="space-y-3">
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRenameId(null)}>
              {t(locale, "page.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (renameId) renamePage(renameId, renameValue);
                setRenameId(null);
              }}
            >
              {t(locale, "page.save")}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
