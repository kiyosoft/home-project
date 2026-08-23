import { Button, Card, Chip, Text } from "heroui-native";
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";

import { buildDefaultDashboard } from "@/dashboard/default-dashboard";
import {
  addWidgetToSection,
  removeWidgetFromSection,
  toggleWidgetSize,
  usedEntityIds,
} from "@/dashboard/edit-dashboard";
import {
  resolveSections,
  widgetForId,
  type ResolvedSection,
} from "@/dashboard/resolve-sections";
import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { Screen } from "@/ui/Screen";
import { EntityPickerSheet } from "@/widgets/EntityPickerSheet";
import { TileGrid } from "@/widgets/TileGrid";

export function HomeScreen() {
  const t = useT();
  const mode = useHaStore((state) => state.mode);
  const entities = useHaStore((state) => state.entities);
  const areas = useHaStore((state) => state.areas);
  const areaByEntity = useHaStore((state) => state.areaByEntity);
  const saved = useDashboardStore((state) => state.document);
  const save = useDashboardStore((state) => state.save);
  const editorMode = useDashboardStore((state) => state.mode);
  const setEditorMode = useDashboardStore((state) => state.setMode);

  const [pickerSectionId, setPickerSectionId] = useState<string | null>(null);
  const editing = editorMode === "edit";

  // Without a saved document the layout is generated from whatever areas the
  // hub reports, so a fresh install still lands on a full dashboard.
  const document = useMemo(
    () => saved ?? buildDefaultDashboard(areas),
    [saved, areas],
  );

  const sections = useMemo(
    () =>
      resolveSections({
        document,
        entities,
        areas,
        areaByEntity,
        t,
        includeEmpty: editing,
      }),
    [document, entities, areas, areaByEntity, t, editing],
  );

  const used = useMemo(() => usedEntityIds(sections), [sections]);

  const removeWidget = (section: ResolvedSection, widgetId: string) => {
    void save(removeWidgetFromSection(document, section, widgetId));
  };

  const resizeWidget = (section: ResolvedSection, widgetId: string) => {
    void save(toggleWidgetSize(document, section, widgetId));
  };

  const addWidget = (entityId: string) => {
    const section = sections.find((entry) => entry.id === pickerSectionId);
    if (!section) return;
    const widget = widgetForId(section.id, entityId, entities);
    if (!widget) return;
    void save(addWidgetToSection(document, section, widget));
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-6 pb-28"
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-2">
            <Text.Heading type="h1">{t("home.title")}</Text.Heading>
            {mode === "demo" ? (
              <Chip
                size="sm"
                color="success"
                variant="soft"
                className="self-start"
              >
                {t("home.demoBadge")}
              </Chip>
            ) : null}
          </View>
          <Button
            size="sm"
            variant={editing ? "primary" : "secondary"}
            onPress={() => setEditorMode(editing ? "live" : "edit")}
          >
            {t(editing ? "home.done" : "home.edit")}
          </Button>
        </View>

        {sections.length ? (
          sections.map((section) => (
            <View key={section.id} className="gap-3">
              {section.title ? (
                <Text className="text-muted px-1 text-sm font-medium uppercase">
                  {section.title}
                </Text>
              ) : null}
              <TileGrid
                widgets={section.widgets}
                editing={editing}
                onRemove={(widgetId) => removeWidget(section, widgetId)}
                onResize={(widgetId) => resizeWidget(section, widgetId)}
                onAdd={() => setPickerSectionId(section.id)}
              />
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

      <EntityPickerSheet
        isOpen={pickerSectionId !== null}
        onOpenChange={(open) => {
          if (!open) setPickerSectionId(null);
        }}
        used={used}
        onSelect={addWidget}
      />
    </Screen>
  );
}
