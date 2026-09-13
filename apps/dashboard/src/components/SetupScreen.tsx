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
import { t, type MessageKey } from "@/i18n";
import { type LoginFailure } from "@/lib/ha-auth";
import { loadConnectionSettings } from "@/lib/settings";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";

type LocalError =
  | "token-required"
  | "credentials-required"
  | "url-required"
  | "invalid-url"
  | "code-required";

const LOCAL_ERROR_KEYS: Record<LocalError, MessageKey> = {
  "token-required": "setup.errorRequired",
  "credentials-required": "setup.errorCredentialsRequired",
  "url-required": "setup.errorUrlRequired",
  "invalid-url": "setup.errorInvalidUrl",
  "code-required": "setup.errorCodeRequired",
};

const LOGIN_ERROR_KEYS: Record<LoginFailure, MessageKey> = {
  "invalid-auth": "setup.errorInvalidAuth",
  "invalid-code": "setup.errorInvalidCode",
  unreachable: "setup.errorUnreachable",
  "not-same-origin": "setup.errorNotSameOrigin",
  blocked: "setup.errorBlocked",
  unknown: "setup.errorGeneric",
};

export function SetupScreen() {
  const saved = loadConnectionSettings();
  const [baseUrl, setBaseUrl] = useState(saved?.baseUrl ?? "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(saved?.token ?? "");
  const [code, setCode] = useState("");
  const [manual, setManual] = useState(
    saved?.authMode === "token" && !!saved.token,
  );
  const [localError, setLocalError] = useState<LocalError | null>(null);
  const locale = useLocaleStore((state) => state.locale);

  const status = useHaStore((state) => state.status);
  const storeError = useHaStore((state) => state.error);
  const loginFailure = useHaStore((state) => state.loginFailure);
  const mfaFlowId = useHaStore((state) => state.mfaFlowId);
  const signIn = useHaStore((state) => state.signIn);
  const submitMfa = useHaStore((state) => state.submitMfa);
  const resetLogin = useHaStore((state) => state.resetLogin);
  const connectLive = useHaStore((state) => state.connectLive);
  const connectDemo = useHaStore((state) => state.connectDemo);

  const busy = status === "connecting";
  const awaitingMfa = mfaFlowId !== null;

  function validUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      setLocalError("invalid-url");
      return false;
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);

    if (awaitingMfa) {
      const trimmedCode = code.trim();
      if (!trimmedCode) {
        setLocalError("code-required");
        return;
      }
      await submitMfa(trimmedCode);
      setCode("");
      return;
    }

    const trimmedUrl = baseUrl.trim();
    if (!trimmedUrl) {
      setLocalError(manual ? "token-required" : "url-required");
      return;
    }
    if (!validUrl(trimmedUrl)) return;

    if (manual) {
      const trimmedToken = token.trim();
      if (!trimmedToken) {
        setLocalError("token-required");
        return;
      }
      try {
        await connectLive(trimmedUrl, trimmedToken);
      } catch {
        // Store already holds the error message.
      }
      return;
    }

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setLocalError("credentials-required");
      return;
    }
    await signIn(trimmedUrl, trimmedUsername, password);
    setPassword("");
  }

  async function handleDemo() {
    setLocalError(null);
    try {
      await connectDemo();
    } catch {
      // Store already holds the error message.
    }
  }

  const messageKey = localError
    ? LOCAL_ERROR_KEYS[localError]
    : loginFailure
      ? LOGIN_ERROR_KEYS[loginFailure]
      : null;
  const error = messageKey ? t(locale, messageKey) : storeError;

  const submitLabel = awaitingMfa
    ? "setup.verify"
    : manual
      ? "setup.connect"
      : "setup.signIn";

  return (
    <div className="dashboard-shell min-h-screen">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 pb-16">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            {t(locale, "setup.language")}
          </span>
          <LanguageSwitcher />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {t(locale, awaitingMfa ? "setup.mfaTitle" : "setup.connectTitle")}
            </CardTitle>
            <CardDescription>
              {t(
                locale,
                awaitingMfa
                  ? "setup.mfaDescription"
                  : manual
                    ? "setup.tokenDescription"
                    : "setup.connectDescription",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                void handleSubmit(event);
              }}
            >
              {awaitingMfa ? (
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">{t(locale, "setup.codeLabel")}</span>
                  <Input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder={t(locale, "setup.codePlaceholder")}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    disabled={busy}
                  />
                </label>
              ) : (
                <>
                  <label className="block space-y-2 text-sm">
                    <span className="font-medium">
                      {t(locale, "setup.urlLabel")}
                    </span>
                    <Input
                      value={baseUrl}
                      onChange={(event) => setBaseUrl(event.target.value)}
                      placeholder="http://homeassistant.local:8123"
                      autoComplete="url"
                      disabled={busy}
                    />
                  </label>
                  {manual ? (
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
                  ) : (
                    <>
                      <label className="block space-y-2 text-sm">
                        <span className="font-medium">
                          {t(locale, "setup.usernameLabel")}
                        </span>
                        <Input
                          value={username}
                          onChange={(event) => setUsername(event.target.value)}
                          autoComplete="username"
                          disabled={busy}
                        />
                      </label>
                      <label className="block space-y-2 text-sm">
                        <span className="font-medium">
                          {t(locale, "setup.passwordLabel")}
                        </span>
                        <Input
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          type="password"
                          autoComplete="current-password"
                          disabled={busy}
                        />
                      </label>
                    </>
                  )}
                </>
              )}

              {error ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                className="w-full"
                variant="default"
                disabled={busy}
              >
                {busy ? t(locale, "setup.connecting") : t(locale, submitLabel)}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={busy}
                onClick={() => {
                  setLocalError(null);
                  setCode("");
                  resetLogin();
                  if (!awaitingMfa) setManual((value) => !value);
                }}
              >
                {t(
                  locale,
                  awaitingMfa
                    ? "setup.cancel"
                    : manual
                      ? "setup.useSignIn"
                      : "setup.useToken",
                )}
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
