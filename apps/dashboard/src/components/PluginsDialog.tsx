import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { t } from "@/i18n";
import type { RegistryCatalogEntry } from "@/plugins/catalog-types";
import { fetchCatalog } from "@/plugins/catalog";
import { isPluginInstalled } from "@/plugins/installed-store";
import {
  installRemotePlugin,
  uninstallRemotePlugin,
} from "@/plugins/remote-plugins";
import { useLocaleStore } from "@/store/locale-store";
import { usePluginsUiStore } from "@/store/plugins-ui-store";

export function PluginsDialog() {
  const locale = useLocaleStore((state) => state.locale);
  const open = usePluginsUiStore((state) => state.pluginsOpen);
  const closePlugins = usePluginsUiStore((state) => state.closePlugins);
  const revision = usePluginsUiStore((state) => state.revision);
  const bump = usePluginsUiStore((state) => state.bump);

  const [catalog, setCatalog] = useState<RegistryCatalogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    void fetchCatalog()
      .then((plugins) => {
        if (!cancelled) setCatalog(plugins);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t(locale, "plugins.loadFailed"),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, revision, locale]);

  async function handleInstall(entry: RegistryCatalogEntry) {
    setBusyId(entry.id);
    setError(null);
    try {
      await installRemotePlugin(entry);
      bump();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t(locale, "plugins.installFailed"),
      );
    } finally {
      setBusyId(null);
    }
  }

  function handleUninstall(pluginId: string) {
    setBusyId(pluginId);
    setError(null);
    try {
      uninstallRemotePlugin(pluginId);
      bump();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(locale, "plugins.uninstallFailed"),
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={closePlugins}
      title={t(locale, "plugins.title")}
      description={t(locale, "plugins.description")}
    >
      <div className="space-y-4 text-sm">
        {error ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
            {error}
          </p>
        ) : null}

        {catalog.length === 0 && !error ? (
          <p className="text-muted-foreground">{t(locale, "plugins.loading")}</p>
        ) : null}

        <ul className="space-y-3">
          {catalog.map((entry) => {
            const installed = isPluginInstalled(entry.id);
            const busy = busyId === entry.id;
            return (
              <li
                key={entry.id}
                className="rounded-xl border border-border px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{entry.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {entry.id} · v{entry.version}
                    </p>
                    <p className="mt-2 text-muted-foreground">
                      {entry.description}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground/80">
                      {t(locale, "plugins.capabilities", {
                        list:
                          entry.capabilities.join(", ") ||
                          t(locale, "plugins.capabilitiesNone"),
                      })}
                    </p>
                  </div>
                  {installed ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => handleUninstall(entry.id)}
                    >
                      {busy ? "…" : t(locale, "plugins.uninstall")}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => void handleInstall(entry)}
                    >
                      {busy ? "…" : t(locale, "plugins.install")}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Dialog>
  );
}
