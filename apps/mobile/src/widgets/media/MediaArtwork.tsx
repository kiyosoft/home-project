import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Image, View } from "react-native";
import { withUniwind } from "uniwind";

const Icon = withUniwind(Ionicons);

/**
 * Album art with a glyph standing in for it. A hub that serves artwork over a
 * path the phone cannot reach is common enough that the fallback is the point.
 */
export function MediaArtwork({
  uri,
  size,
  label,
}: {
  uri: string | null;
  size: number;
  label?: string;
}) {
  // Tracked by URL, not a flag: the next track deserves its own attempt.
  const [failedUri, setFailedUri] = useState<string | null>(null);

  return (
    <View
      className="bg-surface-tertiary items-center justify-center overflow-hidden rounded-lg"
      style={{ width: size, height: size }}
    >
      {uri && uri !== failedUri ? (
        <Image
          accessibilityLabel={label}
          source={{ uri }}
          onError={() => setFailedUri(uri)}
          resizeMode="cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <Icon
          name="musical-notes"
          size={Math.round(size * 0.42)}
          className="text-muted"
        />
      )}
    </View>
  );
}
