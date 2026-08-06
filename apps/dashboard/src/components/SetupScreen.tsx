import { useState, type FormEvent } from "react";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { loadConnectionSettings } from "@/lib/settings";
import { useHaStore } from "@/store/ha-store";

export function SetupScreen() {
  const saved = loadConnectionSettings();
  const [baseUrl, setBaseUrl] = useState(saved?.baseUrl ?? "");
  const [token, setToken] = useState(saved?.token ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

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
      setLocalError(
        "Home Assistant URL and long-lived access token are required.",
      );
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setLocalError("Enter a valid URL, e.g. http://homeassistant.local:8123");
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
        <Card>
          <CardHeader>
            <CardTitle>Connect Home Assistant</CardTitle>
            <CardDescription>
              Use a long-lived access token from your HA profile. Entity data
              stays on your network.
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
                <span className="font-medium">Home Assistant URL</span>
                <Input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder="http://homeassistant.local:8123"
                  autoComplete="url"
                  disabled={busy}
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Long-lived access token</span>
                <Input
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="Paste token"
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
                {busy ? "Connecting…" : "Connect"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Try demo mode</CardTitle>
            <CardDescription>
              Explore a sample dashboard with simulated lights, switches, and
              sensors — no Home Assistant required.
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
              Start demo
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
