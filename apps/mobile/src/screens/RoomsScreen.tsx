import {
  areaSummary,
  deriveArea,
  entitiesInArea,
} from "@ethio/ha-sdk";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { Card, Separator, Text } from "heroui-native";
import { Fragment, useMemo } from "react";
import { ScrollView, View } from "react-native";
import { withUniwind } from "uniwind";

import { useHaStore, useLiveSession } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { ConnectionNotice } from "@/ui/ConnectionNotice";
import { ConnectionStatusChip } from "@/ui/ConnectionStatusChip";
import { ListGroup } from "@/ui/haptic";
import { Screen } from "@/ui/Screen";

const Icon = withUniwind(Ionicons);

export function RoomsScreen() {
  const t = useT();
  const live = useLiveSession();
  const mode = useHaStore((state) => state.mode);
  const status = useHaStore((state) => state.status);
  const entities = useHaStore((state) => state.entities);
  const areas = useHaStore((state) => state.areas);
  const areaByEntity = useHaStore((state) => state.areaByEntity);

  const rooms = useMemo(
    () => [...areas].sort((a, b) => a.name.localeCompare(b.name)),
    [areas],
  );

  if (
    mode !== "demo" &&
    Object.keys(entities).length === 0 &&
    (status === "connecting" ||
      status === "reconnecting" ||
      status === "error")
  ) {
    return (
      <Screen>
        <Text.Heading type="h1">{t("rooms.title")}</Text.Heading>
        <ConnectionNotice />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-6 pb-28"
      >
        <View className="gap-3">
          <Text.Heading type="h1">{t("rooms.title")}</Text.Heading>
          <ConnectionStatusChip />
        </View>

        {rooms.length === 0 ? (
          <Card>
            <Card.Body className="gap-2">
              <Card.Title>{t("rooms.emptyTitle")}</Card.Title>
              <Card.Description>{t("rooms.emptyBody")}</Card.Description>
            </Card.Body>
          </Card>
        ) : (
          <ListGroup>
            {rooms.map((area, index) => {
              const overview = deriveArea(
                live ? entities : {},
                entitiesInArea(areaByEntity, area.area_id),
              );
              const summary = live
                ? areaSummary(overview, {
                    ideal: t("widget.area.ideal"),
                    empty: t("widget.area.noDevices"),
                  })
                : t("widget.state.unavailable");
              return (
                <Fragment key={area.area_id}>
                  {index > 0 ? <Separator className="mx-4" /> : null}
                  <ListGroup.Item
                    onPress={() =>
                      router.push(`/rooms/${area.area_id}` as Href)
                    }
                  >
                    <ListGroup.ItemPrefix>
                      <Icon
                        name="grid-outline"
                        size={22}
                        className="text-foreground"
                      />
                    </ListGroup.ItemPrefix>
                    <ListGroup.ItemContent>
                      <ListGroup.ItemTitle numberOfLines={1}>
                        {area.name}
                      </ListGroup.ItemTitle>
                      <ListGroup.ItemDescription numberOfLines={1}>
                        {summary}
                      </ListGroup.ItemDescription>
                    </ListGroup.ItemContent>
                    <ListGroup.ItemSuffix />
                  </ListGroup.Item>
                </Fragment>
              );
            })}
          </ListGroup>
        )}
      </ScrollView>
    </Screen>
  );
}
