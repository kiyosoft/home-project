import { router } from "expo-router";
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

import { parseOrigin } from "@/lib/url";
import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { ConnectionStatusChip } from "@/ui/ConnectionStatusChip";
import { LanguageSwitcher } from "@/ui/LanguageSwitcher";
import { ThemeChooser } from "@/ui/ThemeChooser";

function hubHost(url: string): string {
  const origin = parseOrigin(url);
  if (!origin) return url;
  return origin.port ? `${origin.host}:${origin.port}` : origin.host;
}

export function SettingsScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const resetDashboard = useDashboardStore((state) => state.reset);
  const mode = useHaStore((state) => state.mode);
  const activeUrl = useHaStore((state) => state.activeUrl);
  const entityCount = useHaStore(
    (state) => Object.keys(state.entities).length,
  );
  const disconnect = useHaStore((state) => state.disconnect);

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-6 px-5 pb-28"
      contentContainerStyle={{ paddingTop: insets.top + 24 }}
    >
      <Text.Heading type="h1">{t("settings.title")}</Text.Heading>

      <Card>
        <Card.Body className="gap-2">
          <Label>{t("settings.hub")}</Label>
          <Card.Title>
            {mode === "demo" ? t("home.demoBadge") : hubHost(activeUrl)}
          </Card.Title>
          <Chip size="sm" color="success" variant="soft">
            {mode === "live"
              ? `${t("settings.connected")} · ${t("home.entityCount", { count: entityCount })}`
              : t("home.entityCount", { count: entityCount })}
          </Chip>
          <ConnectionStatusChip />
        </Card.Body>
      </Card>

      {mode === "live" ? (
        <Card>
          <Card.Body className="gap-3">
            <Label>{t("settings.connection")}</Label>
            <Card.Description>
              {t("settings.connectionDescription")}
            </Card.Description>
            <Button
              variant="secondary"
              className="self-start"
              onPress={() => router.push("/connection")}
            >
              {t("connection.title")}
            </Button>
          </Card.Body>
        </Card>
      ) : null}

      <Card>
        <Card.Body className="gap-3">
          <Label>{t("setup.language")}</Label>
          <LanguageSwitcher />
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="gap-3">
          <Label>{t("settings.theme")}</Label>
          <ThemeChooser />
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="gap-3">
          <Label>{t("settings.dashboard")}</Label>
          <Card.Description>
            {t("settings.resetLayoutDescription")}
          </Card.Description>
          <Dialog isOpen={resetOpen} onOpenChange={setResetOpen}>
            <Dialog.Trigger asChild>
              <Button variant="secondary" className="self-start">
                {t("settings.resetLayout")}
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay />
              <Dialog.Content>
                <Dialog.Title>{t("settings.resetLayout")}</Dialog.Title>
                <Dialog.Description>
                  {t("settings.resetLayoutConfirm")}
                </Dialog.Description>
                <View className="flex-row justify-end gap-3">
                  <Button variant="ghost" onPress={() => setResetOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button
                    onPress={() => {
                      setResetOpen(false);
                      void resetDashboard();
                    }}
                  >
                    {t("settings.resetLayout")}
                  </Button>
                </View>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog>
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
                {t("common.cancel")}
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
