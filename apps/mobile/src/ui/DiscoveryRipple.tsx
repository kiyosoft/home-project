import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Text, useThemeColor } from "heroui-native";

import { FADE_MS } from "@/ui/motion";

const CANVAS = 300;
const SIZE = 220;
const RING_DURATION_MS = 2400;
const STAGGER_MS = 800;
const PIN_RADIUS = SIZE * 0.38;
const PIN_HIT = 56;

export interface DiscoveryPin {
  id: string;
  name: string;
}

interface DiscoveryRippleProps {
  scanning: boolean;
  pins: DiscoveryPin[];
  accessibilityLabel: string;
  onPress?: () => void;
  onSelectPin?: (id: string) => void;
}

/**
 * A quiet radar while Zeroconf looks for a hub. Found instances land as pins
 * on the rings instead of a list underneath.
 */
export function DiscoveryRipple({
  scanning,
  pins,
  accessibilityLabel,
  onPress,
  onSelectPin,
}: DiscoveryRippleProps) {
  const reduced = useReducedMotion();
  const accent = useThemeColor("accent");

  return (
    <View
      className="items-center justify-center"
      style={{ width: CANVAS, height: CANVAS }}
    >
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ busy: scanning }}
        className="items-center justify-center"
        style={{ width: SIZE, height: SIZE }}
      >
        <Ring delay={0} scanning={scanning} reduced={reduced} />
        <Ring delay={STAGGER_MS} scanning={scanning} reduced={reduced} />
        <Ring delay={STAGGER_MS * 2} scanning={scanning} reduced={reduced} />
        <View className="bg-accent h-16 w-16 items-center justify-center rounded-full">
          <View className="bg-accent-foreground/90 h-3 w-3 rounded-full" />
        </View>
      </Pressable>

      {pins.map((pin, index) => {
        const { x, y } = pinPoint(index, pins.length);
        return (
          <Animated.View
            key={pin.id}
            entering={
              reduced ? undefined : FadeIn.duration(FADE_MS).delay(index * 60)
            }
            pointerEvents="box-none"
            style={{
              position: "absolute",
              left: x - PIN_HIT / 2,
              top: y - 36,
              width: PIN_HIT,
              alignItems: "center",
            }}
          >
            <Pressable
              onPress={() => onSelectPin?.(pin.id)}
              accessibilityRole="button"
              accessibilityLabel={pin.name}
              hitSlop={8}
              className="items-center"
            >
              <Ionicons name="location-sharp" size={30} color={accent} />
              <Text className="text-center text-xs font-medium" numberOfLines={1}>
                {pin.name}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

/** Spread pins around the ring so a second find does not cover the first. */
function pinPoint(index: number, total: number): { x: number; y: number } {
  const start = -Math.PI / 2 + (total === 1 ? Math.PI / 5 : Math.PI / total);
  const angle = start + (2 * Math.PI * index) / Math.max(total, 1);
  const center = CANVAS / 2;
  return {
    x: center + PIN_RADIUS * Math.cos(angle),
    y: center + PIN_RADIUS * Math.sin(angle),
  };
}

function Ring({
  delay,
  scanning,
  reduced,
}: {
  delay: number;
  scanning: boolean;
  reduced: boolean | null;
}) {
  const progress = useSharedValue(reduced ? 0.55 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = 0.45 + delay / (STAGGER_MS * 6);
      return;
    }

    progress.value = 0;
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, {
          duration: scanning ? RING_DURATION_MS : RING_DURATION_MS * 1.6,
          easing: Easing.out(Easing.quad),
        }),
        -1,
        false,
      ),
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [delay, progress, reduced, scanning]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.28 + progress.value * 0.72 }],
    opacity: scanning
      ? 0.55 * (1 - progress.value)
      : 0.22 * (1 - progress.value),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      className="border-accent absolute rounded-full border"
      style={[{ width: SIZE, height: SIZE }, style]}
    />
  );
}
