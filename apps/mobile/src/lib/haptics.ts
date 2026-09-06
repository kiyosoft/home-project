import * as Haptics from "expo-haptics";

export type HapticKind =
  | "tap"
  | "toggle"
  | "select"
  | "warn"
  | "success"
  | "error";

/**
 * Fire-and-forget haptic. Failures are swallowed so a simulator, web, or a
 * phone with haptics off never breaks a press.
 */
export function haptic(kind: HapticKind = "tap"): void {
  void play(kind);
}

export const hapticTap = (): void => haptic("tap");
export const hapticToggle = (): void => haptic("toggle");
export const hapticSelect = (): void => haptic("select");
export const hapticWarn = (): void => haptic("warn");
export const hapticSuccess = (): void => haptic("success");
export const hapticError = (): void => haptic("error");

async function play(kind: HapticKind): Promise<void> {
  try {
    switch (kind) {
      case "toggle":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return;
      case "select":
        await Haptics.selectionAsync();
        return;
      case "warn":
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        );
        return;
      case "success":
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        return;
      case "error":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      default:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Native module missing, or the OS refused the request.
  }
}

/**
 * Wraps a press handler so the haptic runs as the action fires. Disabled
 * controls stay silent. `always` covers Dialog triggers that own the press.
 */
export function withHapticPress<E>(
  handler: ((event: E) => void) | null | undefined,
  disabled: boolean | null | undefined,
  kind: HapticKind = "tap",
  always = false,
): ((event: E) => void) | undefined {
  if (!handler && !always) return handler ?? undefined;
  return (event) => {
    if (!disabled) haptic(kind);
    handler?.(event);
  };
}

/** Animated pressables may pass a SharedValue; wrap only real functions. */
export function hapticPressProp<H>(
  handler: H,
  disabled: boolean | null | undefined,
  kind: HapticKind = "tap",
  always = false,
): H {
  if (handler != null && typeof handler !== "function") return handler;
  return withHapticPress(
    handler as ((event: never) => void) | null | undefined,
    disabled,
    kind,
    always,
  ) as H;
}

/** Ten ticks across the range, so a dimmer clicks without buzzing on every pixel. */
export function sliderTickIndex(
  value: number,
  min: number,
  max: number,
  ticks = 10,
): number {
  const span = max - min;
  if (span <= 0) return 0;
  return Math.round(((value - min) / span) * ticks);
}
