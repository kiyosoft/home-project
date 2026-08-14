import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Home Assistant echoes a new state a few hundred milliseconds after a service
 * call, so a slider bound straight to entity state snaps backwards mid-drag.
 * This keeps the value the user chose until the entity catches up.
 */
export function useLiveValue(
  value: number,
  holdMs = 1400,
): [number, (next: number, hold?: boolean) => void] {
  const [local, setLocal] = useState(value);
  const holdUntil = useRef(0);

  useEffect(() => {
    if (Date.now() < holdUntil.current) return;
    setLocal(value);
  }, [value]);

  const set = useCallback(
    (next: number, hold = true) => {
      holdUntil.current = hold ? Date.now() + holdMs : 0;
      setLocal(next);
    },
    [holdMs],
  );

  return [local, set];
}

/**
 * Emits at most once per `waitMs` while dragging, always delivering the final
 * value. Without this a drag floods the websocket with service calls.
 */
export function useThrottledEmit(
  emit: ((value: number) => void) | undefined,
  waitMs: number,
): { send: (value: number) => void; flush: (value: number) => void } {
  const emitRef = useRef(emit);
  emitRef.current = emit;

  const lastSentAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queued = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    queued.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  const deliver = useCallback((value: number) => {
    lastSentAt.current = Date.now();
    emitRef.current?.(value);
  }, []);

  const send = useCallback(
    (value: number) => {
      const elapsed = Date.now() - lastSentAt.current;
      if (elapsed >= waitMs) {
        clear();
        deliver(value);
        return;
      }
      queued.current = value;
      if (timer.current !== null) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        const next = queued.current;
        queued.current = null;
        if (next !== null) deliver(next);
      }, waitMs - elapsed);
    },
    [clear, deliver, waitMs],
  );

  const flush = useCallback(
    (value: number) => {
      clear();
      deliver(value);
    },
    [clear, deliver],
  );

  return { send, flush };
}
