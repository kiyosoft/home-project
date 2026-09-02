export function friendlyName(
  entity: { entity_id: string; attributes: Record<string, unknown> } | undefined,
  fallback: string,
): string {
  const name = entity?.attributes.friendly_name;
  if (typeof name === "string" && name.trim()) return name;
  return entity?.entity_id ?? fallback;
}

export function widgetTitle(config: Record<string, unknown>): string {
  const title = config.title;
  return typeof title === "string" ? title.trim() : "";
}

export function widgetEntityId(config: Record<string, unknown>): string {
  const id = config.entity_id;
  return typeof id === "string" ? id : "";
}
