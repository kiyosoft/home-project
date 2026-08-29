import {
  LegendList,
  type LegendListRenderItemProps,
} from "@legendapp/list/react-native";
import { Button, Card, Chip, Text } from "heroui-native";
import { useCallback, useMemo, useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";

import {
  buildDashboardRows,
  type DashboardRow,
  type RowSpacing,
} from "@/dashboard/dashboard-rows";
import { DEFAULT_DASHBOARD } from "@/dashboard/default-dashboard";
import {
  addWidgetToSection,
  removeWidgetFromSection,
  sectionForEdit,
  toggleWidgetSize,
  usedEntityIds,
} from "@/dashboard/edit-dashboard";
import { resolveSections, widgetForId } from "@/dashboard/resolve-sections";
import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { ConnectionNotice } from "@/ui/ConnectionNotice";
import { ConnectionStatusChip } from "@/ui/ConnectionStatusChip";
import { Screen } from "@/ui/Screen";
import { EntityPickerSheet } from "@/widgets/EntityPickerSheet";
import { TILE_GAP, TileRow } from "@/widgets/TileRow";

/** The gaps the old ScrollView applied with `gap-6` between sections and `gap-3` under a title. */
const SECTION_GAP = 24;
const TITLE_GAP = 12;

/** Space above a row, now that the rows carry their own spacing. */
const SPACING: Record<RowSpacing, number> = {
  section: SECTION_GAP,
  title: 0,
  row: TILE_GAP,
};

/** A half tile is the shortest row, so the list starts from that guess. */
const ESTIMATED_ROW_HEIGHT = 148;

export function HomeScreen() {
  const t = useT();
  const mode = useHaStore((state) => state.mode);
  const status = useHaStore((state) => state.status);
  const entities = useHaStore((state) => state.entities);
  const areas = useHaStore((state) => state.areas);
  const areaByEntity = useHaStore((state) => state.areaByEntity);
  const saved = useDashboardStore((state) => state.document);
  const save = useDashboardStore((state) => state.save);
  const editorMode = useDashboardStore((state) => state.mode);
  const setEditorMode = useDashboardStore((state) => state.setMode);

  const [pickerSectionId, setPickerSectionId] = useState<string | null>(null);
  // Measured once for the whole list: rows cannot measure themselves in time.
  const [width, setWidth] = useState(0);
  const editing = editorMode === "edit";

  // Without a saved document the screen starts empty. Tiles appear only after
  // the user picks them.
  const document = saved ?? DEFAULT_DASHBOARD;

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
  const rows = useMemo(
    () => buildDashboardRows({ sections, editing }),
    [sections, editing],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next !== width) setWidth(next);
  };

  const removeWidget = useCallback(
    (sectionId: string, widgetId: string) => {
      const section = sections.find((entry) => entry.id === sectionId);
      if (!section) return;
      void save(removeWidgetFromSection(document, section, widgetId));
    },
    [sections, document, save],
  );

  const resizeWidget = useCallback(
    (sectionId: string, widgetId: string) => {
      const section = sections.find((entry) => entry.id === sectionId);
      if (!section) return;
      void save(toggleWidgetSize(document, section, widgetId));
    },
    [sections, document, save],
  );

  const addWidget = useCallback(
    (entityId: string) => {
      if (!pickerSectionId) return;
      const section = sectionForEdit(sections, document, pickerSectionId);
      if (!section) return;
      const widget = widgetForId(section.id, entityId, entities);
      if (!widget) return;
      void save(addWidgetToSection(document, section, widget));
    },
    [sections, pickerSectionId, entities, document, save],
  );

  const startAdding = () => {
    const sectionId = document.sections[0]?.id;
    if (!sectionId) return;
    setEditorMode("edit");
    setPickerSectionId(sectionId);
  };

  const renderRow = useCallback(
    ({ item }: LegendListRenderItemProps<DashboardRow>) => {
      if (item.kind === "header") {
        return (
          <View style={{ paddingTop: SECTION_GAP, paddingBottom: TITLE_GAP }}>
            <Text className="text-muted px-1 text-sm font-medium uppercase">
              {item.title}
            </Text>
          </View>
        );
      }

      return (
        <View style={{ paddingTop: SPACING[item.spacing] }}>
          <TileRow
            widgets={item.widgets}
            width={width}
            withAdd={item.withAdd}
            editing={editing}
            onRemove={(widgetId) => removeWidget(item.sectionId, widgetId)}
            onResize={(widgetId) => resizeWidget(item.sectionId, widgetId)}
            onAdd={() => setPickerSectionId(item.sectionId)}
          />
        </View>
      );
    },
    [width, editing, removeWidget, resizeWidget],
  );

  // Only when there is nothing cached to show. A reconnect that fails later
  // keeps the last known tiles on screen with the status chip explaining why.
  // Demo mode is excluded; a null mode is not, because that is the tick between
  // restoring the session and the first connect.
  if (
    mode !== "demo" &&
    status !== "connected" &&
    Object.keys(entities).length === 0
  ) {
    return (
      <Screen>
        <Text.Heading type="h1">{t("home.title")}</Text.Heading>
        <ConnectionNotice />
      </Screen>
    );
  }

  const header = (
    <View className="flex-row items-start justify-between gap-3">
      <View className="flex-1 gap-2">
        <Text.Heading type="h1">{t("home.title")}</Text.Heading>
        {mode === "demo" ? (
          <Chip size="sm" color="success" variant="soft" className="self-start">
            {t("home.demoBadge")}
          </Chip>
        ) : (
          <ConnectionStatusChip />
        )}
      </View>
      <Button
        size="sm"
        variant={editing ? "primary" : "secondary"}
        onPress={() => setEditorMode(editing ? "live" : "edit")}
      >
        {t(editing ? "home.done" : "home.edit")}
      </Button>
    </View>
  );

  const empty = (
    <View className="pt-6">
      <Card>
        <Card.Body className="gap-3">
          <Card.Title>{t("home.emptyTitle")}</Card.Title>
          <Card.Description>{t("home.emptyBody")}</Card.Description>
          <Chip size="sm" color="success" variant="soft" className="self-start">
            {t("home.entityCount", { count: Object.keys(entities).length })}
          </Chip>
          <Button size="sm" className="self-start" onPress={startAdding}>
            {t("home.addWidget")}
          </Button>
        </Card.Body>
      </Card>
    </View>
  );

  return (
    <Screen>
      <View className="flex-1" onLayout={onLayout}>
        {width > 0 ? (
          <LegendList
            data={rows}
            renderItem={renderRow}
            keyExtractor={(row) => row.id}
            getItemType={(row) => row.kind}
            // Tiles hold optimistic state while a service call lands, and a
            // recycled row would hand it to whichever entity scrolls in.
            recycleItems={false}
            estimatedItemSize={ESTIMATED_ROW_HEIGHT}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 112 }}
            ListHeaderComponent={header}
            ListEmptyComponent={empty}
          />
        ) : null}
      </View>

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
