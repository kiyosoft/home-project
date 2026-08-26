import * as Clipboard from "expo-clipboard";
import {
  Button,
  Card,
  Chip,
  FieldError,
  Input,
  Label,
  LinkButton,
  Spinner,
  Text,
  TextField,
  useThemeColor,
} from "heroui-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDiscovery, type DiscoveredInstance } from "@/lib/discovery";
import type { MessageKey } from "@/i18n";
import { failureField, failureMessageKey } from "@/lib/connection-error";
import { isHttpUrl } from "@/lib/url";
import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { LanguageSwitcher } from "@/ui/LanguageSwitcher";

type LocalError = "required" | "invalid-url" | null;

const LOCAL_ERROR_KEYS: Record<Exclude<LocalError, null>, MessageKey> = {
  required: "setup.errorRequired",
  "invalid-url": "setup.errorInvalidUrl",
};

export function ConnectScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const accentForeground = useThemeColor("accent-foreground");

  const status = useHaStore((state) => state.status);
  const failure = useHaStore((state) => state.failure);
  const savedProfile = useHaStore((state) => state.profile);
  const login = useHaStore((state) => state.login);
  const connectWithToken = useHaStore((state) => state.connectWithToken);
  const connectDemo = useHaStore((state) => state.connectDemo);

  const [baseUrl, setBaseUrl] = useState(
    savedProfile.externalUrl || savedProfile.internalUrl,
  );
  const [token, setToken] = useState("");
  const [tokenVisible, setTokenVisible] = useState(false);
  const [manual, setManual] = useState(false);
  const [localError, setLocalError] = useState<LocalError>(null);

  const busy = status === "connecting";
  const discovery = useDiscovery(!busy);

  const badField = localError ? null : failureField(failure);
  const addressInvalid = localError === "invalid-url" || badField === "address";
  const tokenInvalid = badField === "token";

  const addressConfirmed =
    failure?.kind === "token-rejected" || failure?.kind === "signed-out";

  function validate(url: string): boolean {
    if (!url) {
      setLocalError("required");
      return false;
    }
    if (!isHttpUrl(url)) {
      setLocalError("invalid-url");
      return false;
    }
    setLocalError(null);
    return true;
  }

  async function handleSignIn() {
    const trimmedUrl = baseUrl.trim();
    if (!validate(trimmedUrl)) return;
    await login(trimmedUrl);
  }

  async function handleTokenConnect() {
    const trimmedUrl = baseUrl.trim();
    const trimmedToken = token.trim();
    if (!trimmedUrl || !trimmedToken) {
      setLocalError("required");
      return;
    }
    if (!validate(trimmedUrl)) return;
    await connectWithToken(trimmedUrl, trimmedToken);
  }

  async function handlePaste() {
    const clipped = await Clipboard.getStringAsync();
    if (clipped) {
      setToken(clipped.trim());
      setLocalError(null);
    }
  }

  async function handleDiscovered(instance: DiscoveredInstance) {
    setBaseUrl(instance.internalUrl);
    setLocalError(null);
    await login(instance.internalUrl, "internal");
  }

  const messageKey: MessageKey | null = localError
    ? LOCAL_ERROR_KEYS[localError]
    : failure
      ? failureMessageKey(failure)
      : null;

  return (
    <KeyboardAvoidingView
      className="bg-background flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerClassName="gap-5 px-5"
        contentContainerStyle={{
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 32,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <Text.Heading type="h1">{t("setup.connectTitle")}</Text.Heading>
          <Text.Paragraph color="muted">
            {t("setup.connectDescription")}
          </Text.Paragraph>
        </View>

        {discovery.available ? (
          <Card>
            <Card.Body className="gap-3">
              <View className="flex-row items-center justify-between gap-2">
                <Card.Title>{t("setup.discoverTitle")}</Card.Title>
                {discovery.scanning ? <Spinner size="sm" /> : null}
              </View>

              {discovery.instances.map((instance) => (
                <Pressable
                  key={instance.id}
                  onPress={() => void handleDiscovered(instance)}
                  disabled={busy}
                  accessibilityRole="button"
                >
                  <View className="border-border rounded-inner border p-3">
                    <Text className="font-medium">{instance.name}</Text>
                    <Text className="text-muted text-sm">
                      {instance.internalUrl}
                    </Text>
                  </View>
                </Pressable>
              ))}

              {discovery.instances.length === 0 && !discovery.scanning ? (
                <Card.Description>{t("setup.discoverEmpty")}</Card.Description>
              ) : null}
            </Card.Body>
            {!discovery.scanning ? (
              <Card.Footer>
                <Button
                  variant="tertiary"
                  size="sm"
                  onPress={discovery.rescan}
                  isDisabled={busy}
                >
                  {t("setup.discoverRescan")}
                </Button>
              </Card.Footer>
            ) : null}
          </Card>
        ) : null}

        <Card>
          <Card.Body className="gap-5">
            <TextField isInvalid={addressInvalid}>
              <View className="flex-row items-center justify-between gap-2">
                <Label>{t("setup.urlLabel")}</Label>
                {addressConfirmed ? (
                  <Chip size="sm" color="success" variant="soft">
                    {t("setup.addressReachable")}
                  </Chip>
                ) : addressInvalid ? (
                  <Chip size="sm" color="danger" variant="soft">
                    {t("setup.addressUnreachable")}
                  </Chip>
                ) : null}
              </View>
              <Input
                value={baseUrl}
                onChangeText={(next) => {
                  setBaseUrl(next);
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

            {manual ? (
              <TextField isInvalid={tokenInvalid}>
                <View className="flex-row items-center justify-between gap-2">
                  <Label>{t("setup.tokenLabel")}</Label>
                  {tokenInvalid ? (
                    <Chip size="sm" color="danger" variant="soft">
                      {t("setup.tokenRejected")}
                    </Chip>
                  ) : null}
                </View>
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
                  <LinkButton size="sm" onPress={handlePaste} isDisabled={busy}>
                    {t("setup.paste")}
                  </LinkButton>
                  <LinkButton
                    size="sm"
                    onPress={() => setTokenVisible((visible) => !visible)}
                    isDisabled={busy || !token}
                  >
                    {tokenVisible ? t("setup.hideToken") : t("setup.showToken")}
                  </LinkButton>
                </View>
              </TextField>
            ) : null}

            {messageKey ? (
              <View className="gap-2">
                <FieldError>{t(messageKey)}</FieldError>
                {failure?.kind === "unreachable" && !localError ? (
                  <Button
                    variant="tertiary"
                    size="sm"
                    onPress={() =>
                      void (manual ? handleTokenConnect() : handleSignIn())
                    }
                    isDisabled={busy}
                  >
                    {t("setup.retry")}
                  </Button>
                ) : null}
              </View>
            ) : null}
          </Card.Body>
          <Card.Footer className="gap-3">
            <Button
              onPress={() =>
                void (manual ? handleTokenConnect() : handleSignIn())
              }
              isDisabled={busy}
            >
              {busy ? <Spinner size="sm" color={accentForeground} /> : null}
              {busy
                ? t(manual ? "setup.connecting" : "setup.signingIn")
                : t(manual ? "setup.connect" : "setup.signIn")}
            </Button>
            <LinkButton
              size="sm"
              onPress={() => {
                setManual((value) => !value);
                setLocalError(null);
              }}
              isDisabled={busy}
            >
              {t(manual ? "setup.useSignIn" : "setup.useToken")}
            </LinkButton>
          </Card.Footer>
        </Card>

        <Card>
          <Card.Body className="gap-2">
            <Card.Title>{t("setup.demoTitle")}</Card.Title>
            <Card.Description>{t("setup.demoDescription")}</Card.Description>
          </Card.Body>
          <Card.Footer>
            <Button variant="secondary" onPress={connectDemo} isDisabled={busy}>
              {t("setup.startDemo")}
            </Button>
          </Card.Footer>
        </Card>

        <View className="flex-row items-center justify-between gap-3 px-1">
          <Label>{t("setup.language")}</Label>
          <LanguageSwitcher />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
