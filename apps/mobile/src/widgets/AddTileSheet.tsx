import Ionicons from "@expo/vector-icons/Ionicons";
import { BottomSheet, Text } from "heroui-native";
import { ScrollView, View } from "react-native";
import { withUniwind } from "uniwind";

import type { MessageKey } from "@/i18n";
import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { ListGroup } from "@/ui/haptic";

const Icon = withUniwind(Ionicons);

export type AddTileChoice =
  | "clock"
  | "batteries"
  | "climate-sensors"
  | "area"
  | "scene"
  | "entity";

const CHOICES: {
  id: AddTileChoice;
  icon: keyof typeof Ionicons.glyphMap;
  title: MessageKey;
  description: MessageKey;
}[] = [
  {
    id: "clock",
    icon: "time-outline",
    title: "picker.typeClock",
    description: "picker.typeClockBody",
  },
  {
    id: "batteries",
    icon: "battery-half-outline",
    title: "picker.typeBatteries",
    description: "picker.typeBatteriesBody",
  },
  {
    id: "climate-sensors",
    icon: "thermometer-outline",
    title: "picker.typeClimateSensors",
    description: "picker.typeClimateSensorsBody",
  },
  {
    id: "area",
    icon: "home-outline",
    title: "picker.typeArea",
    description: "picker.typeAreaBody",
  },
  {
    id: "scene",
    icon: "color-wand-outline",
    title: "picker.typeScene",
    description: "picker.typeSceneBody",
  },
  {
    id: "entity",
    icon: "grid-outline",
    title: "picker.typeEntity",
    description: "picker.typeEntityBody",
  },
];

export function WidgetTypeSheet({
  isOpen,
  onOpenChange,
  onSelect,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (choice: AddTileChoice) => void;
}) {
  const t = useT();

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          <BottomSheet.Title>{t("picker.typeTitle")}</BottomSheet.Title>
          <BottomSheet.Description>
            {t("picker.typeDescription")}
          </BottomSheet.Description>
          <ScrollView className="pt-4" showsVerticalScrollIndicator={false}>
            <ListGroup>
              {CHOICES.map((choice) => (
                <ListGroup.Item
                  key={choice.id}
                  onPress={() => onSelect(choice.id)}
                >
                  <ListGroup.ItemPrefix>
                    <Icon name={choice.icon} size={20} className="text-muted" />
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>{t(choice.title)}</ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>
                      {t(choice.description)}
                    </ListGroup.ItemDescription>
                  </ListGroup.ItemContent>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </ScrollView>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

export function AreaPickerSheet({
  isOpen,
  onOpenChange,
  onSelect,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (areaId: string, name: string) => void;
}) {
  const t = useT();
  const areas = useHaStore((state) => state.areas);

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          <BottomSheet.Title>{t("picker.areaTitle")}</BottomSheet.Title>
          <BottomSheet.Description>
            {t("picker.areaDescription")}
          </BottomSheet.Description>
          <ScrollView className="pt-4" showsVerticalScrollIndicator={false}>
            {areas.length === 0 ? (
              <Text className="text-muted py-8 text-center">
                {t("picker.areaEmpty")}
              </Text>
            ) : (
              <ListGroup>
                {areas.map((area) => (
                  <ListGroup.Item
                    key={area.area_id}
                    onPress={() => onSelect(area.area_id, area.name)}
                  >
                    <ListGroup.ItemPrefix>
                      <Icon name="home-outline" size={20} className="text-muted" />
                    </ListGroup.ItemPrefix>
                    <ListGroup.ItemContent>
                      <ListGroup.ItemTitle>{area.name}</ListGroup.ItemTitle>
                    </ListGroup.ItemContent>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
            <View className="h-8" />
          </ScrollView>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
