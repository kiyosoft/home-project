import { useCallback } from "react";

import { useLiveSession } from "@/store/ha-store";
import { entityName, isUnavailable, useStoredEntity } from "@/store/use-entity";
import { useDetailSheet } from "@/widgets/DetailSheet";
import { readString } from "@/widgets/types";

/** Shared entity lookup, title, and long-press detail opener for every tile. */
export function useTile(config: Record<string, unknown>) {
  const entityId = readString(config, "entity_id");
  const stored = useStoredEntity(entityId);
  const live = useLiveSession();
  const entity = live ? stored : undefined;
  const sheet = useDetailSheet();
  const title = readString(config, "title") || entityName(stored, entityId);

  const openEntityDetail = useCallback(() => {
    if (entityId) sheet.openEntity(entityId, title);
  }, [entityId, sheet, title]);

  return {
    entityId,
    entity,
    title,
    unavailable: !live || isUnavailable(stored),
    sheet,
    openEntityDetail,
  };
}
