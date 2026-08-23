import Ionicons from "@expo/vector-icons/Ionicons";
import { PressableFeedback } from "heroui-native";
import { withUniwind } from "uniwind";

import { cn } from "@/ui/cn";

const Icon = withUniwind(Ionicons);

export interface TileButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}

/** Round icon control for the in-tile actions: step a setpoint, stop a cover. */
export function TileButton({
  icon,
  label,
  onPress,
  disabled = false,
  active = false,
}: TileButtonProps) {
  return (
    <PressableFeedback
      onPress={onPress}
      isDisabled={disabled}
      accessibilityLabel={label}
      accessibilityRole="button"
      className={cn(
        "bg-surface-tertiary size-9 items-center justify-center rounded-full",
        active && "bg-accent",
        disabled && "opacity-40",
      )}
    >
      <Icon
        name={icon}
        size={18}
        className={active ? "text-accent-foreground" : "text-foreground"}
      />
    </PressableFeedback>
  );
}
