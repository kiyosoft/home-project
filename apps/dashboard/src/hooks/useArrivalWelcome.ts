import {
  ARRIVAL_WINDOW_MS,
  firstName,
  latestAccountArrival,
  personDisplayName,
} from "@ethio/ha-sdk";
import { notifyEntityStoreChanged } from "@ethio/plugin-sdk";
import { useEffect, useState } from "react";

import {
  previousPeopleSnapshot,
  refreshTemplateVariables,
} from "@/lib/template-variables";
import { useHaStore } from "@/store/ha-store";

export function useArrivalWelcome(): {
  arrived: boolean;
  name: string;
} {
  const entities = useHaStore((state) => state.entities);
  const [now, setNow] = useState(() => Date.now());
  const arrival = latestAccountArrival({
    entities,
    now,
    previousStates: previousPeopleSnapshot(),
  });

  useEffect(() => {
    if (!arrival?.last_changed) return;
    const changed = Date.parse(arrival.last_changed);
    if (!Number.isFinite(changed)) return;
    const remaining = changed + ARRIVAL_WINDOW_MS - Date.now();
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => {
      setNow(Date.now());
      refreshTemplateVariables();
      notifyEntityStoreChanged();
    }, remaining + 50);
    return () => window.clearTimeout(timer);
  }, [arrival?.last_changed]);

  return {
    arrived: Boolean(arrival),
    name: arrival ? firstName(personDisplayName(arrival)) : "",
  };
}
