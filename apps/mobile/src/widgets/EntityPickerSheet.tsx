import type { HassEntities } from "@ethio/ha-sdk";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useBottomSheetScrollableCreator } from "@gorhom/bottom-sheet";
import {
  LegendList,
  type LegendListRenderItemProps,
} from "@legendapp/list/react-native";
import {
  BottomSheet,
  SearchField,
  Text,
  useBottomSheetAwareHandlers,
} from "heroui-native";
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View } from "react-native";
import { withUniwind } from "uniwind";

import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { entityDomain, entityName } from "@/store/use-entity";
import { ListGroup } from "@/ui/haptic";
import { widgetForEntity } from "@/widgets/registry";

const Icon = withUniwind(Ionicons);

/** One collator for the whole list: `localeCompare` builds one per call. */
const collator = new Intl.Collator();

const ROW_HEIGHT = 72;

const DOMAIN_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  light: "bulb-outline",
  switch: "toggle-outline",
  input_boolean: "toggle-outline",
  fan: "sync-outline",
  lock: "lock-closed-outline",
  climate: "thermometer-outline",
  cover: "browsers-outline",
  camera: "videocam-outline",
  sensor: "analytics-outline",
  binary_sensor: "radio-outline",
  scene: "color-wand-outline",
  script: "play-outline",
};

const WIDGET_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  "@ethio/sinksar/today": "book-outline",
  "@ethio/teamtracker/team-card": "football-outline",
};

interface Candidate {
  entityId: string;
  name: string;
  /** Name and id lowercased once, so a keystroke does not re-case every row. */
  search: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/** The entity map, the used ids, and the filter as they were on open. */
interface Snapshot {
  entities: HassEntities;
  used: Set<string>;
  domains?: readonly string[];
}

const EMPTY_SNAPSHOT: Snapshot = { entities: {}, used: new Set() };

function buildCandidates({ entities, used, domains }: Snapshot): Candidate[] {
  const list: Candidate[] = [];

  for (const entity of Object.values(entities)) {
    if (used.has(entity.entity_id)) continue;
    const domain = entityDomain(entity.entity_id);

    let icon: keyof typeof Ionicons.glyphMap;
    if (domains) {
      if (!domains.includes(domain)) continue;
      icon = DOMAIN_ICONS[domain] ?? "ellipse-outline";
    } else {
      const def = widgetForEntity(entity);
      if (!def) continue;
      icon = WIDGET_ICONS[def.id] ?? DOMAIN_ICONS[domain] ?? "ellipse-outline";
    }

    const name = entityName(entity);
    list.push({
      entityId: entity.entity_id,
      name,
      search: `${name}\n${entity.entity_id}`.toLowerCase(),
      icon,
    });
  }

  list.sort((a, b) => collator.compare(a.name, b.name));
  return list;
}

export interface EntityPickerSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Entity ids already on the dashboard, hidden so a tile is never duplicated. */
  used: Set<string>;
  /** Limit the list to these domains instead of the widget registry. */
  domains?: readonly string[];
  onSelect: (entityId: string) => void;
}

/** Lives inside the sheet so the keyboard handlers find their context. */
function PickerSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  return (
    <SearchField value={value} onChange={onChange}>
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input
          placeholder={placeholder}
          autoCorrect={false}
          autoCapitalize="none"
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  );
}

const PickerRow = memo(function PickerRow({
  item,
  onSelect,
}: {
  item: Candidate;
  onSelect: (entityId: string) => void;
}) {
  return (
    <View className="pb-2">
      <ListGroup>
        <ListGroup.Item onPress={() => onSelect(item.entityId)}>
          <ListGroup.ItemPrefix>
            <Icon name={item.icon} size={20} className="text-muted" />
          </ListGroup.ItemPrefix>
          <ListGroup.ItemContent>
            <ListGroup.ItemTitle numberOfLines={1}>
              {item.name}
            </ListGroup.ItemTitle>
            <ListGroup.ItemDescription numberOfLines={1}>
              {item.entityId}
            </ListGroup.ItemDescription>
          </ListGroup.ItemContent>
          <ListGroup.ItemSuffix>
            <Icon name="add" size={20} className="text-accent" />
          </ListGroup.ItemSuffix>
        </ListGroup.Item>
      </ListGroup>
    </View>
  );
});

/**
 * Entity chooser for edit mode. Clock, batteries, and area tiles are chosen
 * first in WidgetTypeSheet; this list is for devices and scenes.
 */
export function EntityPickerSheet({
  isOpen,
  onOpenChange,
  used,
  domains,
  onSelect,
}: EntityPickerSheetProps) {
  const t = useT();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const renderScrollComponent = useBottomSheetScrollableCreator();

  // Read the entities once per open. A Home Assistant update replaces the
  // entity map and hands down a fresh `used` Set, and sorting every entity that
  // often is what made the sheet crawl. Rows show a name and an id, so a
  // snapshot taken on open cannot look stale.
  const latestUsed = useRef(used);
  latestUsed.current = used;
  const latestDomains = useRef(domains);
  latestDomains.current = domains;
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT);

  useEffect(() => {
    if (!isOpen) return;
    setSnapshot({
      entities: useHaStore.getState().entities,
      used: latestUsed.current,
      domains: latestDomains.current,
    });
  }, [isOpen]);

  const candidates = useMemo(() => buildCandidates(snapshot), [snapshot]);

  const results = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    if (!needle) return candidates;
    return candidates.filter((item) => item.search.includes(needle));
  }, [candidates, deferredQuery]);

  const close = useCallback(
    (open: boolean) => {
      if (!open) setQuery("");
      onOpenChange(open);
    },
    [onOpenChange],
  );

  const handleSelect = useCallback(
    (entityId: string) => {
      onSelect(entityId);
      close(false);
    },
    [onSelect, close],
  );

  const renderItem = useCallback(
    ({ item }: LegendListRenderItemProps<Candidate>) => (
      <PickerRow item={item} onSelect={handleSelect} />
    ),
    [handleSelect],
  );

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={close}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          snapPoints={["60%", "90%"]}
          enableOverDrag={false}
          enableDynamicSizing={false}
          keyboardBehavior="extend"
          contentContainerClassName="h-full"
        >
          <BottomSheet.Title>
            {t(domains ? "picker.sceneTitle" : "picker.title")}
          </BottomSheet.Title>
          <BottomSheet.Description>
            {t(domains ? "picker.sceneDescription" : "picker.description")}
          </BottomSheet.Description>

          <View className="pb-3 pt-4">
            <PickerSearch
              value={query}
              onChange={setQuery}
              placeholder={t("picker.searchPlaceholder")}
            />
          </View>

          <LegendList
            data={results}
            renderItem={renderItem}
            keyExtractor={(item) => item.entityId}
            recycleItems
            estimatedItemSize={ROW_HEIGHT}
            renderScrollComponent={renderScrollComponent}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
            ListEmptyComponent={
              <Text className="text-muted py-8 text-center">
                {t(domains ? "picker.sceneEmpty" : "picker.empty")}
              </Text>
            }
          />
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
