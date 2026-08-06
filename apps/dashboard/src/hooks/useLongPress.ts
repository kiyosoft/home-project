import { useRef, type PointerEvent as ReactPointerEvent } from "react";

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  ms?: number;
  disabled?: boolean;
}

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

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const start = (event: ReactPointerEvent) => {
    if (disabled) return;
    if (event.button != null && event.button !== 0) return;
    fired.current = false;
    clear();
    timer.current = setTimeout(() => {
      fired.current = true;
      suppressClickUntil = Date.now() + 500;
      onLongPress();
    }, ms);
  };

  const end = () => {
    const wasFired = fired.current;
    clear();
    if (!wasFired && !disabled) {
      onClick?.();
    }
  };

  return {
    onPointerDown: start,
    onPointerUp: end,
    onPointerLeave: clear,
    onPointerCancel: clear,
  };
}
