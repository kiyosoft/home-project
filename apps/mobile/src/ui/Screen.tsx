import { View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "./cn";

/**
 * Shared page chrome for screens inside the tab shell. Top inset only — the
 * floating tab bar owns the bottom safe area.
 */
export function Screen({ className, style, children, ...rest }: ViewProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={cn("bg-background flex-1 px-5", className)}
      style={[{ paddingTop: insets.top + 24 }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}
