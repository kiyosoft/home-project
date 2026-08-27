import Ionicons from "@expo/vector-icons/Ionicons";
import { useThemeColor } from "heroui-native";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassSurface } from "@/ui/GlassSurface";

const SIZE = 56;
const EDGE_GAP = 20;
/**
 * The native tab bar sits outside the safe area inset, so its height has to be
 * cleared by hand to keep the button off the tab labels.
 */
const TAB_BAR_HEIGHT = 52;

interface AssistFabProps {
  label: string;
  onPress: () => void;
}

export function AssistFab({ label, onPress }: AssistFabProps) {
  const insets = useSafeAreaInsets();
  const accent = useThemeColor("accent");
  const accentForeground = useThemeColor("accent-foreground");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        position: "absolute",
        right: EDGE_GAP,
        bottom: insets.bottom + TAB_BAR_HEIGHT + EDGE_GAP,
        zIndex: 10,
        elevation: 10,
      }}
    >
      <GlassSurface
        level="chrome"
        interactive
        tintColor={accent}
        className="items-center justify-center"
        style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2 }}
      >
        <Ionicons name="sparkles" size={24} color={accentForeground} />
      </GlassSurface>
    </Pressable>
  );
}
