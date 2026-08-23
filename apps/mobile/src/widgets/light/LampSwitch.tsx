import { Switch, useThemeColor } from "heroui-native";

import type { LightWash } from "@/widgets/light/light-wash";

export interface LampSwitchProps {
  isSelected: boolean;
  onSelectedChange: (next: boolean) => void;
  isDisabled?: boolean;
  /** Null while the lamp is dark, which leaves the theme colors alone. */
  wash: LightWash | null;
}

/**
 * A switch that turns the lamp's own color when on. The off color stays the
 * theme default so an unlit light is indistinguishable from any other toggle.
 */
export function LampSwitch({
  isSelected,
  onSelectedChange,
  isDisabled = false,
  wash,
}: LampSwitchProps) {
  const off = useThemeColor("default");

  return (
    <Switch
      isSelected={isSelected}
      onSelectedChange={onSelectedChange}
      isDisabled={isDisabled}
      animation={
        wash ? { backgroundColor: { value: [off, wash.fill] } } : undefined
      }
    >
      <Switch.Thumb
        animation={
          wash
            ? { backgroundColor: { value: ["white", wash.switchThumb] } }
            : undefined
        }
      />
    </Switch>
  );
}
