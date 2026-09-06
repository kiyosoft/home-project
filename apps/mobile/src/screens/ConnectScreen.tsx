import * as Clipboard from "expo-clipboard";
import {
  Button,
  FieldError,
  Input,
  Label,
  LinkButton,
  Spinner,
  Text,
  TextField,
  useThemeColor,
} from "heroui-native";
import { useRef, useState, type MutableRefObject } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDiscovery } from "@/lib/discovery";
import type { MessageKey } from "@/i18n";
import { failureField, failureMessageKey } from "@/lib/connection-error";
import { normalizeBaseUrl } from "@/lib/url";
import { useHaStore, type AddressSlot } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { DiscoveryRipple } from "@/ui/DiscoveryRipple";
import { LanguageSwitcher } from "@/ui/LanguageSwitcher";

type Step = "discover" | "sign-in";

type LocalError =
  | "required"
  | "invalid-url"
  | "credentials-required"
  | "url-required"
  | "code-required"
  | null;

const LOCAL_ERROR_KEYS: Record<Exclude<LocalError, null>, MessageKey> = {
  required: "setup.errorRequired",
  "invalid-url": "setup.errorInvalidUrl",
  "credentials-required": "setup.errorCredentialsRequired",
  "url-required": "setup.errorUrlRequired",
  "code-required": "setup.errorCodeRequired",
};

export function ConnectScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const savedProfile = useHaStore((state) => state.profile);
  const mfaFlowId = useHaStore((state) => state.mfaFlowId);
  const resetLogin = useHaStore((state) => state.resetLogin);

  const [step, setStep] = useState<Step>("discover");
  const [hubName, setHubName] = useState("");
  const [baseUrl, setBaseUrl] = useState(
    savedProfile.externalUrl || savedProfile.internalUrl,
  );
  const slot = useRef<AddressSlot>("external");

  const awaitingMfa = mfaFlowId !== null;
  const discovery = useDiscovery(step === "discover");

  function openSignIn(url: string, nextSlot: AddressSlot, name = "") {
    setBaseUrl(url);
    setHubName(name);
    slot.current = nextSlot;
    setStep("sign-in");
  }

  function backToDiscover() {
    resetLogin();
    setHubName("");
    setStep("discover");
  }

  if (step === "discover" && !awaitingMfa) {
    const found = discovery.instances.length;
    const scanning = discovery.scanning && discovery.available;
    const titleKey =
      found === 0
        ? scanning
          ? "setup.searching"
          : "setup.discoverEmpty"
        : found === 1
          ? "setup.foundTitle"
          : "setup.foundTitleMany";
    const bodyKey =
      found === 0
        ? scanning
          ? "setup.searchingBody"
          : "setup.discoverEmptyBody"
        : "setup.foundBody";

    return (
      <View
        className="bg-background flex-1"
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <View className="items-end px-5">
          <LanguageSwitcher />
        </View>

        <View className="items-center gap-2 px-8 pt-6">
          <Text.Heading type="h1" className="text-center">
            {t(titleKey)}
          </Text.Heading>
          <Text.Paragraph color="muted" className="text-center">
            {t(bodyKey)}
          </Text.Paragraph>
        </View>

        <View className="flex-1 items-center justify-center">
          <DiscoveryRipple
            scanning={scanning}
            pins={discovery.instances.map((instance) => ({
              id: instance.id,
              name: instance.name,
            }))}
            accessibilityLabel={
              scanning ? t("setup.searching") : t("setup.discoverRescan")
            }
            onPress={discovery.available ? discovery.rescan : undefined}
            onSelectPin={(id) => {
              const instance = discovery.instances.find(
                (entry) => entry.id === id,
              );
              if (!instance) return;
              openSignIn(instance.internalUrl, "internal", instance.name);
            }}
          />
        </View>

        <View className="gap-3 px-5">
          <Text className="text-muted text-center text-sm">
            {t("setup.discoverHint")}
          </Text>
          <Button
            variant="secondary"
            onPress={() =>
              openSignIn(
                savedProfile.externalUrl || savedProfile.internalUrl,
                "external",
              )
            }
          >
            {t("setup.connectManually")}
          </Button>
          {discovery.available && !scanning ? (
            <LinkButton size="sm" onPress={discovery.rescan}>
              {t("setup.discoverRescan")}
            </LinkButton>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <SignInForm
      baseUrl={baseUrl}
      hubName={hubName}
      slot={slot}
      onBaseUrlChange={setBaseUrl}
      onBack={backToDiscover}
    />
  );
}

function SignInForm({
  baseUrl,
  hubName,
  slot,
  onBaseUrlChange,
  onBack,
}: {
  baseUrl: string;
  hubName: string;
  slot: MutableRefObject<AddressSlot>;
  onBaseUrlChange: (url: string) => void;
  onBack: () => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const accentForeground = useThemeColor("accent-foreground");

  const status = useHaStore((state) => state.status);
  const failure = useHaStore((state) => state.failure);
  const mfaFlowId = useHaStore((state) => state.mfaFlowId);
  const signIn = useHaStore((state) => state.signIn);
  const submitMfa = useHaStore((state) => state.submitMfa);
  const resetLogin = useHaStore((state) => state.resetLogin);
  const connectWithToken = useHaStore((state) => state.connectWithToken);
  const connectDemo = useHaStore((state) => state.connectDemo);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [token, setToken] = useState("");
  const [tokenVisible, setTokenVisible] = useState(false);
  const [code, setCode] = useState("");
  const [manual, setManual] = useState(false);
  const [localError, setLocalError] = useState<LocalError>(null);

  const busy = status === "connecting";
  const awaitingMfa = mfaFlowId !== null;
  const showUrl = !hubName;
  const badField = localError ? null : failureField(failure);
  const addressInvalid = localError === "invalid-url" || badField === "address";
  const tokenInvalid = badField === "token";
  const credentialsInvalid = badField === "credentials";
  const codeInvalid = localError === "code-required" || badField === "code";

  function resolve(url: string): string | null {
    if (!url) {
      setLocalError("url-required");
      return null;
    }
    const normalized = normalizeBaseUrl(url);
    if (!normalized) {
      setLocalError("invalid-url");
      return null;
    }
    setLocalError(null);
    onBaseUrlChange(normalized);
    return normalized;
  }

  async function handleSignIn() {
    if (awaitingMfa) {
      const trimmedCode = code.trim();
      if (!trimmedCode) {
        setLocalError("code-required");
        return;
      }
      setLocalError(null);
      await submitMfa(trimmedCode);
      setCode("");
      return;
    }

    const url = resolve(baseUrl.trim());
    if (!url) return;

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setLocalError("credentials-required");
      return;
    }
    await signIn(url, trimmedUsername, password, slot.current);
    setPassword("");
  }

  async function handleTokenConnect() {
    const trimmedToken = token.trim();
    if (!baseUrl.trim() || !trimmedToken) {
      setLocalError("required");
      return;
    }
    const url = resolve(baseUrl.trim());
    if (!url) return;
    await connectWithToken(url, trimmedToken, slot.current);
  }

  async function handlePaste() {
    const clipped = await Clipboard.getStringAsync();
    if (clipped) {
      setToken(clipped.trim());
      setLocalError(null);
    }
  }

  const messageKey: MessageKey | null = localError
    ? LOCAL_ERROR_KEYS[localError]
    : failure
      ? failureMessageKey(failure)
      : null;

  const submitLabel = awaitingMfa
    ? "setup.verify"
    : manual
      ? "setup.connect"
      : "setup.signIn";

  return (
    <KeyboardAvoidingView
      className="bg-background flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerClassName="gap-6 px-5"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center justify-between">
          <LinkButton
            size="sm"
            onPress={() => {
              resetLogin();
              setCode("");
              setLocalError(null);
              onBack();
            }}
            isDisabled={busy}
          >
            {t("common.back")}
          </LinkButton>
          <LanguageSwitcher />
        </View>

        {awaitingMfa ? (
          <Text.Heading type="h2">{t("setup.mfaTitle")}</Text.Heading>
        ) : hubName ? (
          <Text.Heading type="h2">{hubName}</Text.Heading>
        ) : null}

        <View className="gap-5">
          {awaitingMfa ? (
            <TextField isInvalid={codeInvalid}>
              <Label>{t("setup.codeLabel")}</Label>
              <Input
                value={code}
                onChangeText={(next) => {
                  setCode(next);
                  setLocalError(null);
                }}
                placeholder={t("setup.codePlaceholder")}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                editable={!busy}
              />
            </TextField>
          ) : (
            <>
              {showUrl ? (
                <TextField isInvalid={addressInvalid}>
                  <Label>{t("setup.urlLabel")}</Label>
                  <Input
                    value={baseUrl}
                    onChangeText={(next) => {
                      onBaseUrlChange(next);
                      slot.current = "external";
                      setLocalError(null);
                    }}
                    placeholder={t("setup.urlPlaceholder")}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    textContentType="URL"
                    editable={!busy}
                  />
                </TextField>
              ) : null}

              {manual ? (
                <TextField isInvalid={tokenInvalid}>
                  <Label>{t("setup.tokenLabel")}</Label>
                  <Input
                    value={token}
                    onChangeText={(next) => {
                      setToken(next);
                      setLocalError(null);
                    }}
                    placeholder={t("setup.tokenPlaceholder")}
                    secureTextEntry={!tokenVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    editable={!busy}
                  />
                  <View className="flex-row justify-end">
                    <LinkButton
                      size="sm"
                      onPress={handlePaste}
                      isDisabled={busy}
                    >
                      {t("setup.paste")}
                    </LinkButton>
                    <LinkButton
                      size="sm"
                      onPress={() => setTokenVisible((visible) => !visible)}
                      isDisabled={busy || !token}
                    >
                      {tokenVisible
                        ? t("setup.hideToken")
                        : t("setup.showToken")}
                    </LinkButton>
                  </View>
                </TextField>
              ) : (
                <>
                  <TextField isInvalid={credentialsInvalid}>
                    <Label>{t("setup.usernameLabel")}</Label>
                    <Input
                      value={username}
                      onChangeText={(next) => {
                        setUsername(next);
                        setLocalError(null);
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="username"
                      textContentType="username"
                      editable={!busy}
                    />
                  </TextField>
                  <TextField isInvalid={credentialsInvalid}>
                    <Label>{t("setup.passwordLabel")}</Label>
                    <Input
                      value={password}
                      onChangeText={(next) => {
                        setPassword(next);
                        setLocalError(null);
                      }}
                      secureTextEntry={!passwordVisible}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="password"
                      textContentType="password"
                      editable={!busy}
                    />
                    <View className="flex-row justify-end">
                      <LinkButton
                        size="sm"
                        onPress={() =>
                          setPasswordVisible((visible) => !visible)
                        }
                        isDisabled={busy || !password}
                      >
                        {passwordVisible
                          ? t("setup.hidePassword")
                          : t("setup.showPassword")}
                      </LinkButton>
                    </View>
                  </TextField>
                </>
              )}
            </>
          )}

          {messageKey ? <FieldError>{t(messageKey)}</FieldError> : null}

          <Button
            onPress={() =>
              void (manual && !awaitingMfa
                ? handleTokenConnect()
                : handleSignIn())
            }
            isDisabled={busy}
          >
            {busy ? <Spinner size="sm" color={accentForeground} /> : null}
            {busy ? t("setup.connecting") : t(submitLabel)}
          </Button>

          <LinkButton
            size="sm"
            onPress={() => {
              setLocalError(null);
              setCode("");
              if (awaitingMfa) {
                resetLogin();
                return;
              }
              setManual((value) => !value);
            }}
            isDisabled={busy}
          >
            {t(
              awaitingMfa
                ? "setup.cancel"
                : manual
                  ? "setup.useSignIn"
                  : "setup.useToken",
            )}
          </LinkButton>

          {!awaitingMfa ? (
            <LinkButton size="sm" onPress={connectDemo} isDisabled={busy}>
              {t("setup.startDemo")}
            </LinkButton>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
