import Ionicons from "@expo/vector-icons/Ionicons";
import { PressableFeedback, Text } from "heroui-native";
import { useState } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { withUniwind } from "uniwind";

import { cn } from "@/ui/cn";

const Icon = withUniwind(Ionicons);

/**
 * A still with a camera glyph standing in when the hub path cannot be loaded.
 * Failure is tracked by URL so a refresh that changes the query still retries.
 */
export function CameraStill({
  uri,
  label,
  className,
  style,
  emptyLabel,
  retryLabel,
  onRetry,
}: {
  uri: string | null;
  label: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
  emptyLabel?: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const show = Boolean(uri && uri !== failedUri);
  const failed = Boolean(uri && uri === failedUri);

  return (
    <View
      className={cn(
        "bg-surface-tertiary items-center justify-center overflow-hidden",
        className,
      )}
      style={style}
    >
      {show && uri ? (
        <Image
          accessibilityLabel={label}
          source={{ uri }}
          onError={() => setFailedUri(uri)}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View className="items-center gap-2 px-4">
          <Icon name="videocam-outline" size={32} className="text-muted" />
          {emptyLabel ? (
            <Text className="text-muted text-sm font-medium">{emptyLabel}</Text>
          ) : null}
          {onRetry && retryLabel && (failed || !uri) ? (
            <PressableFeedback
              onPress={() => {
                setFailedUri(null);
                onRetry();
              }}
              accessibilityLabel={retryLabel}
              accessibilityRole="button"
            >
              <Text className="text-foreground text-xs">{retryLabel}</Text>
            </PressableFeedback>
          ) : null}
        </View>
      )}
    </View>
  );
}
