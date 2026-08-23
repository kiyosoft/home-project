import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Card,
  Chip,
  Dialog,
  Label,
  Text,
} from "heroui-native";

import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { LanguageSwitcher } from "@/ui/LanguageSwitcher";

function hubHost(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

export function SettingsScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const mode = useHaStore((state) => state.mode);
  const baseUrl = useHaStore((state) => state.baseUrl);
  const entityCount = useHaStore(
    (state) => Object.keys(state.entities).length,
  );
  const disconnect = useHaStore((state) => state.disconnect);

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-6 px-5"
      contentContainerStyle={{ paddingTop: insets.top + 24 }}
    >
      <Text.Heading type="h1">{t("settings.title")}</Text.Heading>

      <Card>
        <Card.Body className="gap-2">
          <Label>{t("settings.hub")}</Label>
          <Card.Title>
            {mode === "demo" ? t("home.demoBadge") : hubHost(baseUrl)}
          </Card.Title>
          <Chip size="sm" color="success" variant="soft">
            {mode === "live"
              ? `${t("settings.connected")} · ${t("home.entityCount", { count: entityCount })}`
              : t("home.entityCount", { count: entityCount })}
          </Chip>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="gap-3">
          <Label>{t("setup.language")}</Label>
          <LanguageSwitcher />
        </Card.Body>
      </Card>

      <Dialog isOpen={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Trigger asChild>
          <Button variant="danger-soft">{t("settings.disconnect")}</Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Title>{t("settings.disconnect")}</Dialog.Title>
            <Dialog.Description>
              {t("settings.disconnectConfirm")}
            </Dialog.Description>
            <View className="flex-row justify-end gap-3">
              <Button variant="ghost" onPress={() => setConfirmOpen(false)}>
                {t("settings.disconnectCancel")}
              </Button>
              <Button
                variant="danger"
                onPress={() => {
                  setConfirmOpen(false);
                  disconnect({ clearSaved: true });
                }}
              >
                {t("settings.disconnect")}
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </ScrollView>
  );
}
