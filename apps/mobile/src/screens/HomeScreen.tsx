import {
  LegendList,
  type LegendListRef,
  type LegendListRenderItemProps,
} from "@legendapp/list/react-native";
import { Button, Card, Chip, Text } from "heroui-native";
import { useCallback, useMemo, useRef, useState } from "react";
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
import { AmbientBackground } from "@/ui/AmbientBackground";
import { ConnectionNotice } from "@/ui/ConnectionNotice";
import { HomeHeader, type HomeSectionChip } from "@/ui/HomeHeader";
import { Screen } from "@/ui/Screen";
import { SectionHeader } from "@/ui/SectionHeader";
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

/** A half tile plus its gap is the shortest row, so the list starts there. */
const ESTIMATED_ROW_HEIGHT = 170;

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

  // Only titled sections get a chip, because an untitled one has no header row
  // to scroll to and nothing to name the chip with.
  const chips = useMemo<HomeSectionChip[]>(
    () =>
      sections
        .filter((section) => section.title)
        .map((section) => ({
          id: section.id,
          title: section.title,
          entityIds: section.widgets
            .map((widget) => widget.config.entity_id)
            .filter((entityId): entityId is string => typeof entityId === "string"),
        })),
    [sections],
  );

  const listRef = useRef<LegendListRef>(null);

  const jumpToSection = useCallback(
    (sectionId: string) => {
      const index = rows.findIndex(
        (row) => row.kind === "header" && row.id === `${sectionId}:header`,
      );
      if (index < 0) return;
      void listRef.current?.scrollToIndex({ index, animated: true });
    },
    [rows],
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
            <SectionHeader title={item.title} entityIds={item.entityIds} />
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
    <HomeHeader
      sections={chips}
      onJumpToSection={jumpToSection}
      editing={editing}
      onToggleEditing={() => setEditorMode(editing ? "live" : "edit")}
    />
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
    <Screen backdrop={<AmbientBackground />}>
      <View className="flex-1" onLayout={onLayout}>
        {width > 0 ? (
          <LegendList
            ref={listRef}
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
