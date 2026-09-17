import Ionicons from "@expo/vector-icons/Ionicons";
import { Spinner, Text } from "heroui-native";
import { useEffect, useState } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { withUniwind } from "uniwind";

import { cn } from "@/ui/cn";
import { PressableFeedback } from "@/ui/haptic";

const Icon = withUniwind(Ionicons);

/**
 * A still with a camera glyph standing in when the hub path cannot be loaded.
 * Failure is tracked by URL so a refresh that changes the query still retries.
 * A new URI keeps the last good frame on screen so the 8s poll does not flash.
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
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    if (!uri) setLoadedOnce(false);
  }, [uri]);

  const show = Boolean(uri && uri !== failedUri);
  const failed = Boolean(uri && uri === failedUri);
  const loading = show && !loadedOnce;

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
          onLoad={() => setLoadedOnce(true)}
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
      {loading ? (
        <View className="absolute inset-0 items-center justify-center bg-black/35">
          <Spinner />
        </View>
      ) : null}
    </View>
  );
}
