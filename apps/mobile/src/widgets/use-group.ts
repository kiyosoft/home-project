import {
  boundEntityIds,
  tallyEntities,
  type HassEntity,
} from "@ethio/ha-sdk";
import { useMemo } from "react";

import { useHaStore } from "@/store/ha-store";

/** Members for a tile that may be bound to a group or an `entity_ids` list. */
export function useGroupMembers(
  config: Record<string, unknown>,
  entity: HassEntity | undefined,
) {
  const entities = useHaStore((state) => state.entities);
  const members = useMemo(
    () => boundEntityIds(config, entity),
    [config, entity],
  );
  return { entities, members };
}

export function useGroupTally(
  config: Record<string, unknown>,
  entity: HassEntity | undefined,
  isActive: (entry: HassEntity) => boolean,
) {
  const { entities, members } = useGroupMembers(config, entity);
  const tally = useMemo(
    () => tallyEntities(entities, members, isActive),
    [entities, members, isActive],
  );
  return { entities, members, tally };
}
