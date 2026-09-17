import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useThemeColor } from "heroui-native";

import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { WASH } from "@/ui/motion";

const STOPS = [0, 0.35, 0.7] as const;
const BREATHE_MS = 2400;
const BREATHE_MIN = 0.18;
const BREATHE_MAX = 0.42;

/**
 * Light looking for a way in while the socket is still coming up. The dashboard
 * is already on screen; this is the wait, not a label.
 */
export function ConnectingWash() {
  const t = useT();
  const reduced = useReducedMotion();
  const accent = useThemeColor("accent");
  const mode = useHaStore((state) => state.mode);
  const status = useHaStore((state) => state.status);
  const waiting =
    mode === "live" &&
    (status === "connecting" || status === "reconnecting");

  const presence = useSharedValue(0);
  const breath = useSharedValue(BREATHE_MIN);

  useEffect(() => {
    presence.value = withTiming(waiting ? 1 : 0, WASH);
  }, [presence, waiting]);

  useEffect(() => {
    if (reduced || !waiting) {
      cancelAnimation(breath);
      breath.value = BREATHE_MIN;
      return;
    }

    breath.value = BREATHE_MIN;
    breath.value = withRepeat(
      withTiming(BREATHE_MAX, {
        duration: BREATHE_MS,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );

    return () => {
      cancelAnimation(breath);
    };
  }, [breath, reduced, waiting]);

  const style = useAnimatedStyle(() => ({
    opacity: presence.value * (reduced ? BREATHE_MIN : breath.value),
  }));

  if (mode !== "live") return null;

  return (
    <Animated.View
      accessible={waiting}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: waiting }}
      accessibilityLabel={
        waiting
          ? t(
              status === "reconnecting"
                ? "status.reconnecting"
                : "status.connecting",
            )
          : undefined
      }
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, style]}
    >
      <LinearGradient
        colors={[accent, accent, "transparent"]}
        locations={STOPS}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}
