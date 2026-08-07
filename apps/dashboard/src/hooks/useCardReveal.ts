import { useCallback, useEffect, useRef, useState } from "react";

/** Ignore brief tab blips; still catch display sleep / longer backgrounding. */
const WAKE_MIN_HIDDEN_MS = 1500;

/**
 * Returns a reveal generation that increments when the active page changes
 * or the screen wakes (document becomes visible after sleep / backgrounding).
 * Remount animated wrappers with this key to replay the entrance.
 */
export function useCardReveal(pageId: string) {
  const [revealKey, setRevealKey] = useState(0);
  const prevPageId = useRef<string | null>(null);
  const hiddenAt = useRef<number | null>(null);

  const bump = useCallback(() => {
    setRevealKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (prevPageId.current === null) {
      prevPageId.current = pageId;
      return;
    }
    if (prevPageId.current !== pageId) {
      prevPageId.current = pageId;
      bump();
    }
  }, [pageId, bump]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        return;
      }
      if (document.visibilityState === "visible") {
        const started = hiddenAt.current;
        hiddenAt.current = null;
        if (started != null && Date.now() - started >= WAKE_MIN_HIDDEN_MS) {
          bump();
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [bump]);

  return revealKey;
}
