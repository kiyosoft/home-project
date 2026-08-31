import { useRef, type PointerEvent as ReactPointerEvent } from "react";

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  ms?: number;
  disabled?: boolean;
}

const MOVE_CANCEL_PX = 8;
const CONTROL_SELECTOR =
  "input, button, select, textarea, a, [role=slider], [role=switch]";

/** Suppress the synthetic click that follows a successful long-press. */
let suppressClickUntil = 0;

if (typeof document !== "undefined") {
  document.addEventListener(
    "click",
    (event) => {
      if (Date.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true,
  );
}

export function useLongPress({
  onLongPress,
  onClick,
  ms = 500,
  disabled = false,
}: UseLongPressOptions) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const origin = useRef({ x: 0, y: 0 });

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const start = (event: ReactPointerEvent) => {
    if (event.button != null && event.button !== 0) return;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest(CONTROL_SELECTOR)
    ) {
      return;
    }
    fired.current = false;
    origin.current = { x: event.clientX, y: event.clientY };
    clear();
    // Long-press is off; the tap still fires.
    if (disabled) return;
    timer.current = setTimeout(() => {
      fired.current = true;
      suppressClickUntil = Date.now() + 500;
      onLongPress();
    }, ms);
  };

  const move = (event: ReactPointerEvent) => {
    if (!timer.current) return;
    const dx = event.clientX - origin.current.x;
    const dy = event.clientY - origin.current.y;
    if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
      clear();
    }
  };

  const end = () => {
    const wasFired = fired.current;
    clear();
    if (!wasFired) {
      onClick?.();
    }
  };

  return {
    onPointerDown: start,
    onPointerMove: move,
    onPointerUp: end,
    onPointerLeave: clear,
    onPointerCancel: clear,
  };
}
