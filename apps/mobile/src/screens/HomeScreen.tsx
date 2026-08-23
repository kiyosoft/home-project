import { Card, Chip, Text } from "heroui-native";
import { useMemo } from "react";
import { ScrollView, View } from "react-native";

import { buildDefaultDashboard } from "@/dashboard/default-dashboard";
import { resolveSections } from "@/dashboard/resolve-sections";
import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { Screen } from "@/ui/Screen";
import { TileGrid } from "@/widgets/TileGrid";

export function HomeScreen() {
  const t = useT();
  const mode = useHaStore((state) => state.mode);
  const entities = useHaStore((state) => state.entities);
  const areas = useHaStore((state) => state.areas);
  const areaByEntity = useHaStore((state) => state.areaByEntity);
  const saved = useDashboardStore((state) => state.document);

  // Without a saved document the layout is generated from whatever areas the
  // hub reports, so a fresh install still lands on a full dashboard.
  const document = useMemo(
    () => saved ?? buildDefaultDashboard(areas),
    [saved, areas],
  );

  const sections = useMemo(
    () => resolveSections({ document, entities, areas, areaByEntity, t }),
    [document, entities, areas, areaByEntity, t],
  );

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-6 pb-12"
      >
        <View className="gap-2">
          <Text.Heading type="h1">{t("home.title")}</Text.Heading>
          {mode === "demo" ? (
            <Chip size="sm" color="success" variant="soft" className="self-start">
              {t("home.demoBadge")}
            </Chip>
          ) : null}
        </View>

        {sections.length ? (
          sections.map((section) => (
            <View key={section.id} className="gap-3">
              {section.title ? (
                <Text className="text-muted px-1 text-sm font-medium uppercase">
                  {section.title}
                </Text>
              ) : null}
              <TileGrid widgets={section.widgets} />
            </View>
          ))
        ) : (
          <Card>
            <Card.Body className="gap-3">
              <Card.Title>{t("home.emptyTitle")}</Card.Title>
              <Card.Description>{t("home.emptyBody")}</Card.Description>
              <Chip size="sm" color="success" variant="soft" className="self-start">
                {t("home.entityCount", { count: Object.keys(entities).length })}
              </Chip>
            </Card.Body>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
