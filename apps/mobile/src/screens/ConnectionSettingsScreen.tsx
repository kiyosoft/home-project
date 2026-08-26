import {
  Button,
  Card,
  Description,
  FieldError,
  Input,
  Label,
  LinkButton,
  Surface,
  Switch,
  TagGroup,
  Text,
  TextField,
} from "heroui-native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  currentSsid,
  ensureSsidPermission,
  hasSsidPermission,
} from "@/lib/home-network";
import { isHttpUrl } from "@/lib/url";
import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";

export function ConnectionSettingsScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();

  const profile = useHaStore((state) => state.profile);
  const activeUrl = useHaStore((state) => state.activeUrl);
  const saveProfile = useHaStore((state) => state.saveProfile);
  const connect = useHaStore((state) => state.connect);

  const [internalUrl, setInternalUrl] = useState(profile.internalUrl);
  const [externalUrl, setExternalUrl] = useState(profile.externalUrl);
  const [network, setNetwork] = useState("");
  const [urlError, setUrlError] = useState<"internal" | "external" | null>(null);
  const [permitted, setPermitted] = useState(true);

  useEffect(() => {
    void hasSsidPermission().then(setPermitted);
  }, []);

  function commitUrl(slot: "internal" | "external", value: string) {
    const trimmed = value.trim();
    if (trimmed && !isHttpUrl(trimmed)) {
      setUrlError(slot);
      return;
    }
    setUrlError(null);
    void saveProfile(
      slot === "internal" ? { internalUrl: trimmed } : { externalUrl: trimmed },
    );
  }

  function addNetwork(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = profile.homeNetworks.some(
      (entry) => entry.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) return;
    void saveProfile({ homeNetworks: [...profile.homeNetworks, trimmed] });
    setNetwork("");
  }

  async function addCurrentNetwork() {
    if (!(await ensureSsidPermission())) {
      setPermitted(false);
      return;
    }
    setPermitted(true);
    const ssid = await currentSsid();
    if (ssid) addNetwork(ssid);
  }

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-6 px-5 pb-28"
      contentContainerStyle={{ paddingTop: insets.top + 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-2">
        <LinkButton
          size="sm"
          className="self-start"
          onPress={() => router.back()}
        >
          {t("common.back")}
        </LinkButton>
        <Text.Heading type="h1">{t("connection.title")}</Text.Heading>
        <Text.Paragraph color="muted">
          {t("connection.description")}
        </Text.Paragraph>
      </View>

      {activeUrl ? (
        <Card>
          <Card.Body className="gap-2">
            <Label>{t("connection.activeAddress")}</Label>
            <Card.Title>{activeUrl}</Card.Title>
            <Button
              size="sm"
              variant="secondary"
              className="self-start"
              onPress={() => void connect()}
            >
              {t("connection.reconnect")}
            </Button>
          </Card.Body>
        </Card>
      ) : null}

      <Card>
        <Card.Body className="gap-5">
          <TextField isInvalid={urlError === "internal"}>
            <Label>{t("connection.internalUrl")}</Label>
            <Input
              value={internalUrl}
              onChangeText={setInternalUrl}
              onBlur={() => commitUrl("internal", internalUrl)}
              placeholder="http://homeassistant.local:8123"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Description>{t("connection.internalUrlHelp")}</Description>
          </TextField>

          <TextField isInvalid={urlError === "external"}>
            <Label>{t("connection.externalUrl")}</Label>
            <Input
              value={externalUrl}
              onChangeText={setExternalUrl}
              onBlur={() => commitUrl("external", externalUrl)}
              placeholder="https://home.example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Description>{t("connection.externalUrlHelp")}</Description>
          </TextField>

          {urlError ? (
            <FieldError>{t("connection.errorInvalidUrl")}</FieldError>
          ) : null}
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="gap-3">
          <View className="flex-row items-center justify-between gap-3">
            <Label className="flex-1">
              {t("connection.prioritizeInternal")}
            </Label>
            <Switch
              isSelected={profile.prioritizeInternal}
              onSelectedChange={(next) =>
                void saveProfile({ prioritizeInternal: next })
              }
            />
          </View>
          <Card.Description>
            {t("connection.prioritizeInternalHelp")}
          </Card.Description>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="gap-4">
          <View className="gap-2">
            <Label>{t("connection.homeNetworks")}</Label>
            <Card.Description>
              {t("connection.homeNetworksHelp")}
            </Card.Description>
          </View>

          {!permitted ? (
            <Surface variant="secondary" className="rounded-inner gap-2 p-4">
              <Text className="font-medium">
                {t("connection.permissionTitle")}
              </Text>
              <Text className="text-muted text-sm">
                {t("connection.permissionBody")}
              </Text>
              <Button
                size="sm"
                variant="secondary"
                className="self-start"
                onPress={() => void addCurrentNetwork()}
              >
                {t("connection.grantPermission")}
              </Button>
            </Surface>
          ) : null}

          <TagGroup
            size="sm"
            variant="surface"
            onRemove={(keys) => {
              void saveProfile({
                homeNetworks: profile.homeNetworks.filter(
                  (name) => !keys.has(name),
                ),
              });
            }}
          >
            <TagGroup.List
              className="flex-row flex-wrap gap-2"
              renderEmptyState={() => (
                <Card.Description>{t("connection.noNetworks")}</Card.Description>
              )}
            >
              {profile.homeNetworks.map((entry) => (
                <TagGroup.Item key={entry} id={entry}>
                  <TagGroup.ItemLabel>{entry}</TagGroup.ItemLabel>
                  <TagGroup.ItemRemoveButton
                    accessibilityLabel={t("connection.removeNetwork", {
                      name: entry,
                    })}
                  />
                </TagGroup.Item>
              ))}
            </TagGroup.List>
          </TagGroup>

          <TextField>
            <Input
              value={network}
              onChangeText={setNetwork}
              onSubmitEditing={() => addNetwork(network)}
              placeholder={t("connection.networkPlaceholder")}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
          </TextField>

          <View className="flex-row flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onPress={() => addNetwork(network)}
              isDisabled={!network.trim()}
            >
              {t("connection.addNetwork")}
            </Button>
            <Button
              size="sm"
              variant="tertiary"
              onPress={() => void addCurrentNetwork()}
            >
              {t("connection.addCurrent")}
            </Button>
          </View>
        </Card.Body>
      </Card>
    </ScrollView>
  );
}
