import { useCallback } from "react";

import { entityName, isUnavailable, useEntity } from "@/store/use-entity";
import { useDetailSheet } from "@/widgets/DetailSheet";
import { readString } from "@/widgets/types";

/** Shared entity lookup, title, and long-press detail opener for every tile. */
export function useTile(config: Record<string, unknown>) {
  const entityId = readString(config, "entity_id");
  const entity = useEntity(entityId);
  const sheet = useDetailSheet();
  const title = readString(config, "title") || entityName(entity, entityId);

  const openEntityDetail = useCallback(() => {
    if (entityId) sheet.openEntity(entityId, title);
  }, [entityId, sheet, title]);

  return {
    entityId,
    entity,
    title,
    unavailable: isUnavailable(entity),
    sheet,
    openEntityDetail,
  };
}
