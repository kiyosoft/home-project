import * as Clipboard from "expo-clipboard";
import {
  Button,
  FieldError,
  Input,
  Label,
  TextField,
} from "heroui-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { MessageKey } from "@/i18n";
import { failureField, failureMessageKey } from "@/lib/connection-error";
import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { GlassSurface } from "@/ui/GlassSurface";
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
          <Text className="text-foreground text-[32px] font-bold">
            {t("setup.connectTitle")}
          </Text>
          <Text className="text-muted text-[15px] leading-5">
            {t("setup.connectDescription")}
          </Text>
        </View>

        <GlassSurface level="chrome" className="gap-5 p-5">
          <TextField isInvalid={addressInvalid}>
            <View className="flex-row items-center justify-between">
              <Label>{t("setup.urlLabel")}</Label>
              {addressConfirmed ? (
                <Text className="text-success text-[13px] font-medium">
                  {t("setup.addressReachable")}
                </Text>
              ) : addressInvalid ? (
                <Text className="text-danger text-[13px] font-medium">
                  {t("setup.addressUnreachable")}
                </Text>
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
            <View className="flex-row items-center justify-between">
              <Label>{t("setup.tokenLabel")}</Label>
              {tokenInvalid ? (
                <Text className="text-danger text-[13px] font-medium">
                  {t("setup.tokenRejected")}
                </Text>
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
            <View className="flex-row justify-end gap-1">
              <Pressable
                accessibilityRole="button"
                onPress={handlePaste}
                disabled={busy}
                className="min-h-11 justify-center px-3"
              >
                <Text className="text-link text-[15px] font-medium">
                  {t("setup.paste")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTokenVisible((visible) => !visible)}
                disabled={busy || !token}
                className="min-h-11 justify-center px-3"
              >
                <Text className="text-link text-[15px] font-medium">
                  {tokenVisible ? t("setup.hideToken") : t("setup.showToken")}
                </Text>
              </Pressable>
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

          <Button onPress={handleConnect} isDisabled={busy}>
            {busy ? t("setup.connecting") : t("setup.connect")}
          </Button>
        </GlassSurface>

        <GlassSurface level="chrome" className="gap-3 p-5">
          <Text className="text-foreground text-[20px] font-semibold">
            {t("setup.demoTitle")}
          </Text>
          <Text className="text-muted text-[15px] leading-5">
            {t("setup.demoDescription")}
          </Text>
          <Button variant="secondary" onPress={connectDemo} isDisabled={busy}>
            {t("setup.startDemo")}
          </Button>
        </GlassSurface>

        <View className="flex-row items-center justify-between gap-3 px-1">
          <Text className="text-muted text-[15px]">{t("setup.language")}</Text>
          <LanguageSwitcher />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
