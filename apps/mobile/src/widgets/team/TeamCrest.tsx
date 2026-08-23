import { hexToRgb, rgbaCss, type TeamSide } from "@ethio/ha-sdk";
import { Text } from "heroui-native";
import { useState } from "react";
import { Image, View } from "react-native";

export function TeamCrest({
  side,
  size,
  outline = true,
}: {
  side: TeamSide;
  size: number;
  outline?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const label = side.abbr ?? "?";
  const rgb = hexToRgb(side.colors[0] ?? "");
  const ring = outline && rgb ? rgbaCss(rgb, 0.85) : undefined;
  const inner = Math.round(size * 0.86);

  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full bg-surface/70"
      style={{
        width: size,
        height: size,
        borderWidth: ring ? 2 : 0,
        borderColor: ring,
      }}
    >
      {side.logo && !failed ? (
        <Image
          accessibilityLabel={side.name ?? label}
          source={{ uri: side.logo }}
          onError={() => setFailed(true)}
          resizeMode="contain"
          style={{ width: inner, height: inner }}
        />
      ) : (
        <Text className="text-foreground text-xs font-semibold">{label}</Text>
      )}
    </View>
  );
}
