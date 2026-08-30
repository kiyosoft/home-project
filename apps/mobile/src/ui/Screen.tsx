import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "./cn";

export interface ScreenProps extends ViewProps {
  /**
   * Painted edge to edge behind the content. Kept outside the padded box so a
   * wash or gradient reaches the screen edges instead of stopping at the gutter.
   */
  backdrop?: ReactNode;
}

/**
 * Shared page chrome for screens inside the tab shell. Top inset only — the
 * floating tab bar owns the bottom safe area.
 */
export function Screen({
  className,
  style,
  backdrop,
  children,
  ...rest
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="bg-background flex-1">
      {backdrop}
      <View
        className={cn("flex-1 px-5", className)}
        style={[{ paddingTop: insets.top + 24 }, style]}
        {...rest}
      >
        {children}
      </View>
    </View>
  );
}
