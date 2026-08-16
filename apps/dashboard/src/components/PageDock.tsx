import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboard-store";
import { useLocaleStore } from "@/store/locale-store";

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
            return (
              <button
                key={page.id}
                type="button"
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted",
                )}
                onClick={() => setActivePage(page.id)}
                onDoubleClick={() => {
                  if (!canEditPages) return;
                  setRenameId(page.id);
                  setRenameValue(page.title);
                }}
              >
                {page.title}
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
          ) : null}
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
