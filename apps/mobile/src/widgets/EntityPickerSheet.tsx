import Ionicons from "@expo/vector-icons/Ionicons";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import {
  BottomSheet,
  ListGroup,
  SearchField,
  Text,
  useBottomSheetAwareHandlers,
} from "heroui-native";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { withUniwind } from "uniwind";

import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { entityDomain, entityName } from "@/store/use-entity";
import { widgetForEntity } from "@/widgets/registry";

const Icon = withUniwind(Ionicons);

const DOMAIN_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  light: "bulb-outline",
  switch: "toggle-outline",
  input_boolean: "toggle-outline",
  fan: "sync-outline",
  lock: "lock-closed-outline",
  climate: "thermometer-outline",
  cover: "browsers-outline",
  sensor: "analytics-outline",
  binary_sensor: "radio-outline",
};

interface Candidate {
  entityId: string;
  name: string;
  domain: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export interface EntityPickerSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Entity ids already on the dashboard, hidden so a tile is never duplicated. */
  used: Set<string>;
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

/**
 * Entity chooser for edit mode. The phone has no widget-type picker: the
 * entity's domain decides the tile through the widget registry.
 */
export function EntityPickerSheet({
  isOpen,
  onOpenChange,
  used,
  onSelect,
}: EntityPickerSheetProps) {
  const t = useT();
  const entities = useHaStore((state) => state.entities);
  const [query, setQuery] = useState("");

  const candidates = useMemo<Candidate[]>(() => {
    const list = Object.values(entities)
      .filter(
        (entity) =>
          !used.has(entity.entity_id) && Boolean(widgetForEntity(entity)),
      )
      .map((entity): Candidate => {
        const def = widgetForEntity(entity);
        return {
          entityId: entity.entity_id,
          name: entityName(entity),
          domain: entityDomain(entity.entity_id),
          icon: def?.id === "@ethio/sinksar/today" ? "book-outline" : undefined,
        };
      });
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [entities, used]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return candidates;
    return candidates.filter(
      (item) =>
        item.name.toLowerCase().includes(needle) ||
        item.entityId.includes(needle),
    );
  }, [candidates, query]);

  const close = (open: boolean) => {
    if (!open) setQuery("");
    onOpenChange(open);
  };

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
          <BottomSheet.Title>{t("picker.title")}</BottomSheet.Title>
          <BottomSheet.Description>
            {t("picker.description")}
          </BottomSheet.Description>

          <View className="pb-3 pt-4">
            <PickerSearch
              value={query}
              onChange={setQuery}
              placeholder={t("picker.searchPlaceholder")}
            />
          </View>

          <BottomSheetFlatList
            data={results}
            keyExtractor={(item: Candidate) => item.entityId}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 32 }}
            renderItem={({ item }: { item: Candidate }) => (
              <ListGroup>
                <ListGroup.Item
                  onPress={() => {
                    onSelect(item.entityId);
                    close(false);
                  }}
                >
                  <ListGroup.ItemPrefix>
                    <Icon
                      name={
                        item.icon ??
                        DOMAIN_ICONS[item.domain] ??
                        "ellipse-outline"
                      }
                      size={20}
                      className="text-muted"
                    />
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
            )}
            ListEmptyComponent={
              <Text className="text-muted py-8 text-center">
                {t("picker.empty")}
              </Text>
            }
          />
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
