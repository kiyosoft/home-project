import Ionicons from "@expo/vector-icons/Ionicons";
import { Text } from "heroui-native";
import { View } from "react-native";
import { withUniwind } from "uniwind";

import { useT } from "@/store/locale-store";
import { cn } from "@/ui/cn";
import { GlassSurface } from "@/ui/GlassSurface";
import { PressableFeedback } from "@/ui/haptic";

const Icon = withUniwind(Ionicons);

export interface HomeDockItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: "home",
  bedroom: "bed-outline",
  energy: "flash-outline",
  environment: "cloudy-outline",
};

export function HomePageDock({
  items,
  activeId,
  onSelect,
}: {
  items: HomeDockItem[];
  activeId?: string;
  onSelect: (id: string) => void;
}) {
  const t = useT();
  if (items.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-3 items-center"
    >
      <GlassSurface level="chrome" className="flex-row items-center gap-1 px-2 py-2">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <PressableFeedback
              key={item.id}
              onPress={() => onSelect(item.id)}
              haptic="select"
              accessibilityLabel={item.title}
              accessibilityRole="button"
              className="items-center"
            >
              <View
                className={cn(
                  "size-11 items-center justify-center rounded-full",
                  active && "bg-accent/20",
                )}
              >
                <Icon
                  name={ICONS[item.id] ?? item.icon}
                  size={20}
                  className={active ? "text-accent" : "text-muted"}
                />
              </View>
              <Text
                className={cn(
                  "text-[10px] font-medium",
                  active ? "text-accent" : "text-muted",
                )}
              >
                {item.id === "home" ? t("tabs.home") : item.title}
              </Text>
            </PressableFeedback>
          );
        })}
      </GlassSurface>
    </View>
  );
}
