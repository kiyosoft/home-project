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
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { MessageKey } from "@/i18n";
import { failureField, failureMessageKey } from "@/lib/connection-error";
import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { LanguageSwitcher } from "@/ui/LanguageSwitcher";

/** Client-side checks that run before we bother the network. */
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
  const savedBaseUrl = useHaStore((state) => state.baseUrl);
  const connectLive = useHaStore((state) => state.connectLive);
  const connectDemo = useHaStore((state) => state.connectDemo);

  const [baseUrl, setBaseUrl] = useState(savedBaseUrl);
  const [token, setToken] = useState("");
  const [tokenVisible, setTokenVisible] = useState(false);
  const [localError, setLocalError] = useState<LocalError>(null);

  const busy = status === "connecting";

  // A local validation error outranks a stale network verdict.
  const badField = localError ? null : failureField(failure);
  const addressInvalid = localError === "invalid-url" || badField === "address";
  const tokenInvalid = badField === "token";

  // The server answered but refused the token, so the address is confirmed good.
  const addressConfirmed = failure?.kind === "token-rejected";

  async function handleConnect() {
    const trimmedUrl = baseUrl.trim();
    const trimmedToken = token.trim();

    if (!trimmedUrl || !trimmedToken) {
      setLocalError("required");
      return;
    }
    try {
      new URL(trimmedUrl);
    } catch {
      setLocalError("invalid-url");
      return;
    }

    setLocalError(null);
    await connectLive(trimmedUrl, trimmedToken);
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
              {/* Pasting is the expected input for a long-lived token, not typing. */}
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
                  {tokenVisible ? t("setup.hideToken") : t("setup.showToken")}
                </LinkButton>
              </View>
            </TextField>

            {/*
              One slot for every failure: required, malformed, unreachable, or
              rejected. Retry only appears when retrying is the right next move.
            */}
            {messageKey ? (
              <View className="gap-2">
                <FieldError>{t(messageKey)}</FieldError>
                {failure?.kind === "unreachable" && !localError ? (
                  <Button
                    variant="tertiary"
                    size="sm"
                    onPress={handleConnect}
                    isDisabled={busy}
                  >
                    {t("setup.retry")}
                  </Button>
                ) : null}
              </View>
            ) : null}
          </Card.Body>
          <Card.Footer>
            <Button onPress={handleConnect} isDisabled={busy}>
              {busy ? (
                <Spinner size="sm" color={accentForeground} />
              ) : null}
              {busy ? t("setup.connecting") : t("setup.connect")}
            </Button>
          </Card.Footer>
        </Card>

        <Card>
          <Card.Body className="gap-2">
            <Card.Title>{t("setup.demoTitle")}</Card.Title>
            <Card.Description>{t("setup.demoDescription")}</Card.Description>
          </Card.Body>
          <Card.Footer>
            <Button
              variant="secondary"
              onPress={connectDemo}
              isDisabled={busy}
            >
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
