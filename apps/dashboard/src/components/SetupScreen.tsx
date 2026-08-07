import { useState, type FormEvent } from "react";

import { AppHeader } from "@/components/AppHeader";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";
import { loadConnectionSettings } from "@/lib/settings";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";

export function SetupScreen() {
  const saved = loadConnectionSettings();
  const [baseUrl, setBaseUrl] = useState(saved?.baseUrl ?? "");
  const [token, setToken] = useState(saved?.token ?? "");
  const [localError, setLocalError] = useState<string | null>(null);
  const locale = useLocaleStore((state) => state.locale);

  const status = useHaStore((state) => state.status);
  const storeError = useHaStore((state) => state.error);
  const connectLive = useHaStore((state) => state.connectLive);
  const connectDemo = useHaStore((state) => state.connectDemo);

  const busy = status === "connecting";

  async function handleConnect(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);

    const trimmedUrl = baseUrl.trim();
    const trimmedToken = token.trim();

    if (!trimmedUrl || !trimmedToken) {
      setLocalError(t(locale, "setup.errorRequired"));
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setLocalError(t(locale, "setup.errorInvalidUrl"));
      return;
    }

    try {
      await connectLive(trimmedUrl, trimmedToken);
    } catch {
      // Store already holds the error message.
    }
  }

  async function handleDemo() {
    setLocalError(null);
    try {
      await connectDemo();
    } catch {
      // Store already holds the error message.
    }
  }

  const error = localError ?? storeError;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            {t(locale, "setup.language")}
          </span>
          <LanguageSwitcher />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t(locale, "setup.connectTitle")}</CardTitle>
            <CardDescription>
              {t(locale, "setup.connectDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                void handleConnect(event);
              }}
            >
              <label className="block space-y-2 text-sm">
                <span className="font-medium">{t(locale, "setup.urlLabel")}</span>
                <Input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder="http://homeassistant.local:8123"
                  autoComplete="url"
                  disabled={busy}
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">
                  {t(locale, "setup.tokenLabel")}
                </span>
                <Input
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder={t(locale, "setup.tokenPlaceholder")}
                  type="password"
                  autoComplete="off"
                  disabled={busy}
                />
              </label>
              {error ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy
                  ? t(locale, "setup.connecting")
                  : t(locale, "setup.connect")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t(locale, "setup.demoTitle")}</CardTitle>
            <CardDescription>
              {t(locale, "setup.demoDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              className="w-full"
              disabled={busy}
              onClick={() => {
                void handleDemo();
              }}
            >
              {t(locale, "setup.startDemo")}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
