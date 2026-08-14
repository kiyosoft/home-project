import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t, type Locale } from "@/i18n";
import { loadConnectionSettings } from "@/lib/settings";
import {
  configureNamedTunnel,
  deleteNamedTunnel,
  fetchTunnelStatus,
  startNamedTunnel,
  startQuickTunnel,
  stopNamedTunnel,
  stopQuickTunnel,
  type TunnelStatus,
} from "@/lib/tunnel-api";
import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";

interface RemoteAccessSettingsProps {
  locale: Locale;
  ensureUnlocked: () => boolean;
}

type Tab = "quick" | "named";

export function RemoteAccessSettings({
  locale,
  ensureUnlocked,
}: RemoteAccessSettingsProps) {
  const connectLive = useHaStore((state) => state.connectLive);
  const setBanner = useDashboardStore((state) => state.setBanner);

  const [probeDone, setProbeDone] = useState(false);
  const [status, setStatus] = useState<TunnelStatus | null>(null);
  const [tab, setTab] = useState<Tab>("quick");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const [apiToken, setApiToken] = useState("");
  const [accountId, setAccountId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [dashboardHostname, setDashboardHostname] = useState("");
  const [haHostname, setHaHostname] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await fetchTunnelStatus();
      if (cancelled) return;
      setStatus(next);
      setProbeDone(true);
      if (next?.named) {
        setAccountId(next.named.accountId);
        setZoneId(next.named.zoneId);
        setDashboardHostname(next.named.dashboardHostname);
        setHaHostname(next.named.haHostname);
        if (next.mode === "named") setTab("named");
      } else if (next?.mode === "quick") {
        setTab("quick");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function runAction(action: () => Promise<TunnelStatus>) {
    if (!ensureUnlocked()) return;
    setBusy(true);
    setLocalError(null);
    try {
      const next = await action();
      setStatus(next);
      if (next.error) setLocalError(next.error);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t(locale, "settings.tunnelError");
      setLocalError(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUseHaUrl() {
    if (!ensureUnlocked()) return;
    const haUrl = status?.haUrl;
    if (!haUrl) return;
    const saved = loadConnectionSettings();
    if (!saved?.token || saved.mode !== "live") {
      setLocalError(t(locale, "settings.tunnelNeedToken"));
      return;
    }
    setBusy(true);
    setLocalError(null);
    try {
      await connectLive(haUrl.replace(/\/$/, ""), saved.token);
      setBanner(t(locale, "settings.tunnelConnectionUpdated"));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t(locale, "settings.tunnelError");
      setLocalError(message);
    } finally {
      setBusy(false);
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setBanner(t(locale, "settings.tunnelCopied"));
    } catch {
      setLocalError(t(locale, "settings.tunnelCopyFailed"));
    }
  }

  if (!probeDone) {
    return (
      <section className="space-y-2">
        <h3 className="font-medium">{t(locale, "settings.tunnel")}</h3>
        <p className="text-muted-foreground">
          {t(locale, "settings.tunnelLoading")}
        </p>
      </section>
    );
  }

  if (!status?.available) {
    return (
      <section className="space-y-2">
        <h3 className="font-medium">{t(locale, "settings.tunnel")}</h3>
        <p className="text-muted-foreground">
          {t(locale, "settings.tunnelUnavailable")}
        </p>
      </section>
    );
  }

  const running = status.running;
  const error = localError || status.error;

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="font-medium">{t(locale, "settings.tunnel")}</h3>
        <p className="text-muted-foreground">{t(locale, "settings.tunnelHint")}</p>
        <p className="text-xs text-muted-foreground">
          {t(locale, "settings.tunnelStatus")}:{" "}
          {running
            ? t(locale, "settings.tunnelRunning")
            : t(locale, "settings.tunnelStopped")}
          {status.mode !== "off" ? ` (${status.mode})` : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={tab === "quick" ? "default" : "outline"}
          size="sm"
          disabled={busy}
          onClick={() => setTab("quick")}
        >
          {t(locale, "settings.tunnelQuick")}
        </Button>
        <Button
          variant={tab === "named" ? "default" : "outline"}
          size="sm"
          disabled={busy}
          onClick={() => setTab("named")}
        >
          {t(locale, "settings.tunnelNamed")}
        </Button>
      </div>

      {tab === "quick" ? (
        <div className="space-y-3">
          <p className="text-muted-foreground">
            {t(locale, "settings.tunnelQuickHint")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={busy || (running && status.mode === "quick")}
              onClick={() => void runAction(() => startQuickTunnel())}
            >
              {t(locale, "settings.tunnelStart")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || !(running && status.mode === "quick")}
              onClick={() => void runAction(() => stopQuickTunnel())}
            >
              {t(locale, "settings.tunnelStop")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-muted-foreground">
            {t(locale, "settings.tunnelNamedHint")}
          </p>
          <label className="block space-y-2">
            <span className="font-medium">
              {t(locale, "settings.tunnelApiToken")}
            </span>
            <Input
              type="password"
              autoComplete="off"
              value={apiToken}
              placeholder={
                status.named?.apiTokenConfigured
                  ? t(locale, "settings.tunnelApiTokenSaved")
                  : t(locale, "settings.tunnelApiTokenPlaceholder")
              }
              onChange={(event) => setApiToken(event.target.value)}
            />
          </label>
          <label className="block space-y-2">
            <span className="font-medium">
              {t(locale, "settings.tunnelAccountId")}
            </span>
            <Input
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            />
          </label>
          <label className="block space-y-2">
            <span className="font-medium">{t(locale, "settings.tunnelZoneId")}</span>
            <Input
              value={zoneId}
              onChange={(event) => setZoneId(event.target.value)}
            />
          </label>
          <label className="block space-y-2">
            <span className="font-medium">
              {t(locale, "settings.tunnelDashboardHost")}
            </span>
            <Input
              value={dashboardHostname}
              placeholder="dashboard.example.com"
              onChange={(event) => setDashboardHostname(event.target.value)}
            />
          </label>
          <label className="block space-y-2">
            <span className="font-medium">{t(locale, "settings.tunnelHaHost")}</span>
            <Input
              value={haHostname}
              placeholder="ha.example.com"
              onChange={(event) => setHaHostname(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() =>
                void runAction(async () => {
                  await configureNamedTunnel({
                    apiToken: apiToken.trim() || undefined,
                    accountId: accountId.trim(),
                    zoneId: zoneId.trim(),
                    dashboardHostname: dashboardHostname.trim(),
                    haHostname: haHostname.trim(),
                  });
                  setApiToken("");
                  return startNamedTunnel();
                })
              }
            >
              {t(locale, "settings.tunnelSaveStart")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || !(running && status.mode === "named")}
              onClick={() => void runAction(() => stopNamedTunnel())}
            >
              {t(locale, "settings.tunnelStop")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || !status.named}
              onClick={() => void runAction(() => deleteNamedTunnel(false))}
            >
              {t(locale, "settings.tunnelClear")}
            </Button>
          </div>
        </div>
      )}

      {status.dashboardUrl || status.haUrl ? (
        <div className="space-y-2 rounded-xl border border-border p-3">
          {status.dashboardUrl ? (
            <UrlRow
              label={t(locale, "settings.tunnelDashboardUrl")}
              value={status.dashboardUrl}
              onCopy={() => void copyText(status.dashboardUrl!)}
              copyLabel={t(locale, "settings.tunnelCopy")}
            />
          ) : null}
          {status.haUrl ? (
            <UrlRow
              label={t(locale, "settings.tunnelHaUrl")}
              value={status.haUrl}
              onCopy={() => void copyText(status.haUrl!)}
              copyLabel={t(locale, "settings.tunnelCopy")}
            />
          ) : null}
          {status.haUrl ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => void handleUseHaUrl()}
            >
              {t(locale, "settings.tunnelUseHaUrl")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-destructive">{error}</p> : null}
    </section>
  );
}

function UrlRow({
  label,
  value,
  onCopy,
  copyLabel,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copyLabel: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{label}</span>
        <Button variant="outline" size="sm" onClick={onCopy}>
          {copyLabel}
        </Button>
      </div>
      <p className="break-all text-xs text-muted-foreground">{value}</p>
    </div>
  );
}
