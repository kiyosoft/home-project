import type { MobileDashboard } from "@ethio/mobile-schema";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  LegendList,
  type LegendListRenderItemProps,
} from "@legendapp/list/react-native";
import { router } from "expo-router";
import { Card, Text, useThemeColor } from "heroui-native";
import { useCallback, useMemo, useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";

import {
  buildDashboardRows,
  type DashboardRow,
  type RowSpacing,
} from "@/dashboard/dashboard-rows";
import {
  addWidgetToSection,
  removeWidgetFromSection,
  sectionForEdit,
  toggleWidgetSize,
  usedEntityIds,
} from "@/dashboard/edit-dashboard";
import { resolveSections, widgetForId } from "@/dashboard/resolve-sections";
import {
  commitAreaDocument,
  documentForArea,
} from "@/rooms/rooms-document";
import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { useRoomsStore } from "@/store/rooms-store";
import { AmbientBackground } from "@/ui/AmbientBackground";
import { ConnectingWash } from "@/ui/ConnectingWash";
import { ConnectionNotice } from "@/ui/ConnectionNotice";
import { Button, Chip } from "@/ui/haptic";
import { Screen } from "@/ui/Screen";
import { EntityPickerSheet } from "@/widgets/EntityPickerSheet";
import { TileRow } from "@/widgets/TileRow";
import { TILE_GAP, columnsForWidth } from "@/widgets/tile-layout";

const TITLE_GAP = 12;

const SPACING: Record<RowSpacing, number> = {
  section: 0,
  title: 0,
  row: TILE_GAP,
};

const ESTIMATED_ROW_HEIGHT = 180;

export function RoomScreen({ areaId }: { areaId: string }) {
  const t = useT();
  const mode = useHaStore((state) => state.mode);
  const status = useHaStore((state) => state.status);
  const entities = useHaStore((state) => state.entities);
  const areas = useHaStore((state) => state.areas);
  const areaByEntity = useHaStore((state) => state.areaByEntity);
  const saved = useRoomsStore((state) => state.document);
  const save = useRoomsStore((state) => state.save);
  const editorMode = useRoomsStore((state) => state.mode);
  const setEditorMode = useRoomsStore((state) => state.setMode);
  const foreground = useThemeColor("foreground");
  const accentForeground = useThemeColor("accent-foreground");

  const [adding, setAdding] = useState(false);
  const [width, setWidth] = useState(0);
  const editing = editorMode === "edit";
  const columns = columnsForWidth(width);

  const area = useMemo(
    () =>
      areas.find((entry) => entry.area_id === areaId) ??
      (areaId ? { area_id: areaId, name: areaId } : null),
    [areas, areaId],
  );

  const document = useMemo(
    () => (area ? documentForArea(saved, area) : null),
    [saved, area],
  );

  const sections = useMemo(() => {
    if (!document) return [];
    return resolveSections({
      document,
      entities,
      areas,
      areaByEntity,
      t,
      includeEmpty: editing,
    }).map((section) => ({ ...section, title: "" }));
  }, [document, entities, areas, areaByEntity, t, editing]);

  const used = useMemo(() => usedEntityIds(sections), [sections]);
  const rows = useMemo(
    () => buildDashboardRows({ sections, editing, columns }),
    [sections, editing, columns],
  );

  const persist = useCallback(
    (next: MobileDashboard) => {
      save(commitAreaDocument(useRoomsStore.getState().document, next));
    },
    [save],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next !== width) setWidth(next);
  };

  const startAdding = useCallback(() => {
    setEditorMode("edit");
    setAdding(true);
  }, [setEditorMode]);

  const removeWidget = useCallback(
    (sectionId: string, widgetId: string) => {
      if (!document) return;
      const section = sections.find((entry) => entry.id === sectionId);
      if (!section) return;
      persist(removeWidgetFromSection(document, section, widgetId));
    },
    [sections, document, persist],
  );

  const resizeWidget = useCallback(
    (sectionId: string, widgetId: string) => {
      if (!document) return;
      const section = sections.find((entry) => entry.id === sectionId);
      if (!section) return;
      persist(toggleWidgetSize(document, section, widgetId));
    },
    [sections, document, persist],
  );

  const addEntity = useCallback(
    (entityId: string) => {
      if (!document) return;
      const section = sectionForEdit(sections, document, document.sections[0]?.id ?? "");
      if (!section) return;
      const widget = widgetForId(section.id, entityId, entities);
      if (!widget) return;
      persist(addWidgetToSection(document, section, widget));
      setAdding(false);
    },
    [sections, document, entities, persist],
  );

  const renderRow = useCallback(
    ({ item }: LegendListRenderItemProps<DashboardRow>) => {
      if (item.kind === "header" || item.kind === "scenes") return null;
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
            onAdd={startAdding}
          />
        </View>
      );
    },
    [width, columns, editing, removeWidget, resizeWidget, startAdding],
  );

  if (!areaId || !area || !document) {
    return (
      <Screen>
        <RoomChrome
          title={t("rooms.missingTitle")}
          editing={false}
          onToggleEditing={() => undefined}
          foreground={foreground}
          accentForeground={accentForeground}
          showEdit={false}
        />
        <Card className="mt-6">
          <Card.Body className="gap-2">
            <Card.Title>{t("rooms.missingTitle")}</Card.Title>
            <Card.Description>{t("rooms.missingBody")}</Card.Description>
          </Card.Body>
        </Card>
      </Screen>
    );
  }

  if (mode !== "demo" && status === "error" && Object.keys(entities).length === 0) {
    return (
      <Screen>
        <RoomChrome
          title={area.name}
          editing={false}
          onToggleEditing={() => undefined}
          foreground={foreground}
          accentForeground={accentForeground}
          showEdit={false}
        />
        <ConnectionNotice />
      </Screen>
    );
  }

  const header = (
    <RoomChrome
      title={area.name}
      editing={editing}
      onToggleEditing={() => setEditorMode(editing ? "live" : "edit")}
      foreground={foreground}
      accentForeground={accentForeground}
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
    <Screen
      backdrop={
        <>
          <AmbientBackground />
          <ConnectingWash />
        </>
      }
    >
      <View className="flex-1" onLayout={onLayout}>
        {width > 0 ? (
          <LegendList
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

      <EntityPickerSheet
        isOpen={adding}
        onOpenChange={setAdding}
        used={used}
        onSelect={addEntity}
      />
    </Screen>
  );
}

function RoomChrome({
  title,
  editing,
  onToggleEditing,
  foreground,
  accentForeground,
  showEdit = true,
}: {
  title: string;
  editing: boolean;
  onToggleEditing: () => void;
  foreground: string;
  accentForeground: string;
  showEdit?: boolean;
}) {
  const t = useT();
  const editLabel = t(editing ? "home.done" : "home.edit");
  return (
    <View className="flex-row items-center gap-2" style={{ marginBottom: TITLE_GAP }}>
      <Button
        size="sm"
        isIconOnly
        variant="secondary"
        accessibilityLabel={t("common.back")}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={18} color={foreground} />
      </Button>
      <Text.Heading type="h1" numberOfLines={1} className="flex-1">
        {title}
      </Text.Heading>
      {showEdit ? (
        <Button
          size="sm"
          isIconOnly
          variant={editing ? "primary" : "secondary"}
          accessibilityLabel={editLabel}
          onPress={onToggleEditing}
        >
          <Ionicons
            name={editing ? "checkmark" : "pencil"}
            size={18}
            color={editing ? accentForeground : foreground}
          />
        </Button>
      ) : null}
    </View>
  );
}
