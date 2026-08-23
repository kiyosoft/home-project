import { useCallback, useEffect, useRef, useState } from "react";

const HOLD_MS = 2500;

/**
 * Shows a value the user just picked until Home Assistant reports it back.
 * Without this a tile snaps to the old state for the length of the round trip.
 * The timeout covers a service call that never lands.
 */
export function useOptimistic<T>(actual: T, holdMs = HOLD_MS) {
  const [pending, setPending] = useState<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => {
    if (pending && Object.is(pending.value, actual)) {
      clear();
      setPending(null);
    }
  }, [actual, pending, clear]);

  useEffect(() => clear, [clear]);

  const push = useCallback(
    (value: T) => {
      setPending({ value });
      clear();
      timer.current = setTimeout(() => setPending(null), holdMs);
    },
    [clear, holdMs],
  );

  return [pending ? pending.value : actual, push] as const;
}
