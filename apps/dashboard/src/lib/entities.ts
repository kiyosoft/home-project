import type { HassEntities, HassEntity } from "@ethio/ha-sdk";

export function getFriendlyName(entity: HassEntity): string {
  const name = entity.attributes.friendly_name;
  if (typeof name === "string" && name.trim()) return name;
  return entity.entity_id;
}

export function getUnit(entity: HassEntity): string | undefined {
  const unit = entity.attributes.unit_of_measurement;
  return typeof unit === "string" ? unit : undefined;
}

export function findFirstEntity(
  entities: HassEntities,
  prefixes: string[],
): string | undefined {
  return Object.keys(entities)
    .filter((id) => prefixes.some((prefix) => id.startsWith(prefix)))
    .sort()[0];
}

export function pickLiveEntityIds(entities: HassEntities) {
  return {
    sensor: findFirstEntity(entities, ["sensor."]),
    toggle: findFirstEntity(entities, [
      "light.",
      "switch.",
      "input_boolean.",
    ]),
    toggleAlt: Object.keys(entities)
      .filter((id) =>
        id.startsWith("light.") ||
        id.startsWith("switch.") ||
        id.startsWith("input_boolean."),
      )
      .sort()[1],
  };
}
