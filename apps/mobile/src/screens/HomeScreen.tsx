import {
  LegendList,
  type LegendListRef,
  type LegendListRenderItemProps,
} from "@legendapp/list/react-native";
import { Card, Text } from "heroui-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";

import { DEMO_DASHBOARD } from "@/dashboard/demo-dashboard";
import {
  buildDashboardRows,
  type DashboardRow,
  type RowSpacing,
} from "@/dashboard/dashboard-rows";
import {
  DEFAULT_DASHBOARD,
  ensureScenesSection,
} from "@/dashboard/default-dashboard";
import {
  addSceneToSection,
  addWidgetToSection,
  removeSceneFromSection,
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
import { Button, Chip } from "@/ui/haptic";
import { HomeHeader, type HomeSectionChip } from "@/ui/HomeHeader";
import { HomePageDock, type HomeDockItem } from "@/ui/HomePageDock";
import { Screen } from "@/ui/Screen";
import { SectionHeader } from "@/ui/SectionHeader";
import { type AddTileChoice } from "@/widgets/AddTileSheet";
import { widgetFromType } from "@/widgets/registry";
import { SceneRow } from "@/widgets/SceneRow";
import { TileRow } from "@/widgets/TileRow";
import { TILE_GAP, columnsForWidth } from "@/widgets/tile-layout";

import { HomeAddSheets, type AddStep } from "./HomeAddSheets";

const SECTION_GAP = 24;
const TITLE_GAP = 12;

const SPACING: Record<RowSpacing, number> = {
  section: SECTION_GAP,
  title: 0,
  row: TILE_GAP,
};

const ESTIMATED_ROW_HEIGHT = 180;

const DOCK_SECTIONS = new Set(["bedroom", "energy", "environment"]);

const INSTANT_TILES: Partial<
  Record<AddTileChoice, { type: string; config: Record<string, unknown> }>
> = {
  clock: { type: "@ethio/core/clock", config: { title: "" } },
  batteries: { type: "@ethio/core/batteries", config: { title: "" } },
  "climate-sensors": {
    type: "@ethio/core/climate-sensors",
    config: { title: "" },
  },
};

const NEXT_STEP: Partial<Record<AddTileChoice, AddStep>> = {
  area: "area",
  scene: "scene",
  entity: "entity",
};

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
  const [addStep, setAddStep] = useState<AddStep | null>(null);
  const [width, setWidth] = useState(0);
  const [activeDock, setActiveDock] = useState("home");
  const editing = editorMode === "edit";
  const columns = columnsForWidth(width);

  const document = useMemo(
    () =>
      ensureScenesSection(
        saved ?? (mode === "demo" ? DEMO_DASHBOARD : DEFAULT_DASHBOARD),
      ),
    [saved, mode],
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
  const rows = useMemo(
    () => buildDashboardRows({ sections, editing, columns }),
    [sections, editing, columns],
  );

  const pickerSection = useMemo(
    () =>
      pickerSectionId
        ? sectionForEdit(sections, document, pickerSectionId)
        : null,
    [sections, document, pickerSectionId],
  );

  const chips = useMemo<HomeSectionChip[]>(() => {
    const next: HomeSectionChip[] = [];
    for (const section of sections) {
      if (!section.title) continue;
      next.push({
        id: section.id,
        title: section.title,
        entityIds:
          section.scenes ??
          section.widgets
            .map((widget) => widget.config.entity_id)
            .filter(
              (entityId): entityId is string => typeof entityId === "string",
            ),
      });
    }
    return next;
  }, [sections]);

  const dockItems = useMemo<HomeDockItem[]>(() => {
    const items: HomeDockItem[] = [
      { id: "home", title: t("tabs.home"), icon: "home" },
    ];
    for (const section of sections) {
      if (!DOCK_SECTIONS.has(section.id) || !section.title) continue;
      items.push({
        id: section.id,
        title: section.title,
        icon: "ellipse-outline",
      });
    }
    return items;
  }, [sections, t]);

  const listRef = useRef<LegendListRef>(null);

  const jumpToSection = useCallback(
    (sectionId: string) => {
      setActiveDock(sectionId);
      if (sectionId === "home") {
        void listRef.current?.scrollToOffset({ offset: 0, animated: true });
        return;
      }
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

  const closeAdd = () => {
    setPickerSectionId(null);
    setAddStep(null);
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

  const removeScene = useCallback(
    (sectionId: string, entityId: string) => {
      const section = sections.find((entry) => entry.id === sectionId);
      if (!section) return;
      void save(removeSceneFromSection(document, section, entityId));
    },
    [sections, document, save],
  );

  const addWidget = useCallback(
    (type: string, config: Record<string, unknown>) => {
      if (!pickerSection) return;
      const widget = widgetFromType(pickerSection.id, type, config);
      if (!widget) return;
      void save(addWidgetToSection(document, pickerSection, widget));
      closeAdd();
    },
    [pickerSection, document, save],
  );

  const addEntity = useCallback(
    (entityId: string) => {
      if (!pickerSection) return;
      if (pickerSection.scenes !== undefined) {
        void save(addSceneToSection(document, pickerSection, entityId));
        closeAdd();
        return;
      }
      if (addStep === "scene") {
        addWidget("@ethio/core/scene", { entity_id: entityId });
        return;
      }
      const widget = widgetForId(pickerSection.id, entityId, entities);
      if (!widget) return;
      void save(addWidgetToSection(document, pickerSection, widget));
      closeAdd();
    },
    [pickerSection, entities, document, save, addStep, addWidget],
  );

  const onChooseType = (choice: AddTileChoice) => {
    const instant = INSTANT_TILES[choice];
    if (instant) {
      addWidget(instant.type, instant.config);
      return;
    }
    setAddStep(NEXT_STEP[choice] ?? "entity");
  };

  const startAdding = useCallback((sectionId: string, step: AddStep) => {
    setEditorMode("edit");
    setPickerSectionId(sectionId);
    setAddStep(step);
  }, [setEditorMode]);

  const renderRow = useCallback(
    ({ item }: LegendListRenderItemProps<DashboardRow>) => {
      if (item.kind === "header") {
        return (
          <View style={{ paddingTop: SECTION_GAP, paddingBottom: TITLE_GAP }}>
            <SectionHeader title={item.title} entityIds={item.entityIds} />
          </View>
        );
      }

      if (item.kind === "scenes") {
        return (
          <View style={{ paddingTop: SPACING[item.spacing] }}>
            <SceneRow
              entityIds={item.entityIds}
              editing={editing}
              withAdd={item.withAdd}
              onRemove={(entityId) => removeScene(item.sectionId, entityId)}
              onAdd={() => startAdding(item.sectionId, "scene")}
            />
          </View>
        );
      }

      return (
        <View style={{ paddingTop: SPACING[item.spacing] }}>
          <TileRow
            widgets={item.widgets}
            width={width}
            columns={columns}
            withAdd={item.withAdd}
            editing={editing}
            onRemove={(widgetId) => removeWidget(item.sectionId, widgetId)}
            onResize={(widgetId) => resizeWidget(item.sectionId, widgetId)}
            onAdd={() => startAdding(item.sectionId, "type")}
          />
        </View>
      );
    },
    [width, columns, editing, removeWidget, resizeWidget, removeScene, startAdding],
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
          <Button
            size="sm"
            className="self-start"
            onPress={() => {
              const sectionId = document.sections.find(
                (section) => section.source.kind !== "scene",
              )?.id;
              if (!sectionId) return;
              startAdding(sectionId, "type");
            }}
          >
            {t("home.addWidget")}
          </Button>
        </Card.Body>
      </Card>
    </View>
  );

  const showDock = dockItems.length > 1;

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
            recycleItems={false}
            estimatedItemSize={ESTIMATED_ROW_HEIGHT}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 168 }}
            ListHeaderComponent={header}
            ListEmptyComponent={empty}
          />
        ) : null}
      </View>

      {showDock ? (
        <HomePageDock
          items={dockItems}
          activeId={activeDock}
          onSelect={jumpToSection}
        />
      ) : null}

      <HomeAddSheets
        step={addStep}
        used={used}
        sceneOnly={pickerSection?.scenes !== undefined}
        onClose={closeAdd}
        onChooseType={onChooseType}
        onPickArea={(areaId, name) =>
          addWidget("@ethio/core/area", { title: name, area_id: areaId })
        }
        onPickEntity={addEntity}
      />
    </Screen>
  );
}
