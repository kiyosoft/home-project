import { useCallback, useEffect, useMemo, useRef } from "react";
import { Gesture, type PanGesture } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";

/**
 * The grid scrolls vertically, so a plain vertical pan on a tile would fight
 * the list. Holding first tells the list this touch is not a scroll, which is
 * the same bargain Apple Home strikes for the gesture.
 */
const HOLD_MS = 220;

/** Travel for the full 0–100% sweep. Roughly one tile tall. */
const TRAVEL = 160;

/** A release that ends a drag must not also count as a tap on the tile. */
const TAP_GRACE_MS = 250;

export interface DimDragOptions {
  /** Current brightness, 0–100. The drag starts from here. */
  value: number;
  isDisabled?: boolean;
  /** Fired continuously while dragging, for optimistic paint. */
  onChange: (percent: number) => void;
  /** Fired once on release, for the service call. */
  onCommit: (percent: number) => void;
}

export interface DimDrag {
  gesture: PanGesture;
  /** True just after a drag, so the tile can swallow the closing tap. */
  justDragged: () => boolean;
}

/**
 * Press and hold a light tile, then drag up or down to dim it. Gives half
 * tiles a brightness control they never had room for, and full tiles one that
 * does not need the finger to find a 4pt slider.
 */
export function useDimDrag({
  value,
  isDisabled = false,
  onChange,
  onCommit,
}: DimDragOptions): DimDrag {
  const endedAt = useRef(0);

  // The gesture runs on the UI thread and cannot read React state, so the
  // brightness is mirrored across and the drag starts from that mirror.
  const start = useSharedValue(value);
  const latest = useSharedValue(value);
  useEffect(() => {
    latest.value = value;
  }, [value, latest]);

  const finish = useCallback(
    (percent: number) => {
      endedAt.current = Date.now();
      onCommit(percent);
    },
    [onCommit],
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!isDisabled)
        .activateAfterLongPress(HOLD_MS)
        .onStart(() => {
          start.value = latest.value;
        })
        .onUpdate((event) => {
          // Up is brighter, so the travel is inverted against screen space.
          const next = start.value - (event.translationY / TRAVEL) * 100;
          runOnJS(onChange)(Math.round(Math.min(100, Math.max(0, next))));
        })
        .onEnd((event) => {
          const next = start.value - (event.translationY / TRAVEL) * 100;
          runOnJS(finish)(Math.round(Math.min(100, Math.max(0, next))));
        }),
    [isDisabled, finish, onChange, start, latest],
  );

  const justDragged = useCallback(
    () => Date.now() - endedAt.current < TAP_GRACE_MS,
    [],
  );

  return { gesture, justDragged };
}
