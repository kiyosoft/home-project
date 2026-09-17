import {
  ARRIVAL_WINDOW_MS,
  personForUser,
  shouldShowArrivalWelcome,
} from "@ethio/ha-sdk";
import { useEffect, useRef, useState } from "react";

import { isLiveSession, useHaStore } from "@/store/ha-store";

export function useArrivalWelcome(): { welcome: boolean } {
  const person = useHaStore((state) =>
    isLiveSession(state.mode, state.status)
      ? personForUser(state.entities, state.userId)
      : undefined,
  );
  const previous = useRef<string | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());

  const welcome = shouldShowArrivalWelcome({
    person,
    previousState: previous.current,
    now,
  });

  useEffect(() => {
    previous.current = person?.state;
  }, [person?.state]);

  useEffect(() => {
    if (!person?.last_changed) return;
    const changed = Date.parse(person.last_changed);
    if (!Number.isFinite(changed)) return;
    const remaining = changed + ARRIVAL_WINDOW_MS - Date.now();
    if (remaining <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), remaining + 50);
    return () => clearTimeout(timer);
  }, [person?.last_changed]);

  return { welcome };
}
