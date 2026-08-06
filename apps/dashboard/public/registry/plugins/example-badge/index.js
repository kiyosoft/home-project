/**
 * Example remote Ethio plugin (ESM).
 * Uses host globals — do not import react / @ethio/plugin-sdk / zod.
 */
const host = globalThis.__ETHIO_HOST__;
if (!host) {
  throw new Error(
    "@ethio/example-badge: host globals missing. Call exposeHostGlobals() before import.",
  );
}

const { definePlugin, defineWidget, useEntity } = host.pluginSdk;
const { jsx, jsxs } = host.jsxRuntime;
const { z } = host.zod;

const configSchema = z.object({
  entity_id: z.string().min(1, "Entity is required"),
});

function friendlyName(entity) {
  const name = entity.attributes.friendly_name;
  if (typeof name === "string" && name.trim()) return name;
  return entity.entity_id;
}

function StatusBadge(props) {
  const config = props.config ?? {};
  const entityId = typeof config.entity_id === "string" ? config.entity_id : "";
  const entity = useEntity(entityId);

  if (!entityId) {
    return jsxs("div", {
      className:
        "flex h-full min-h-28 flex-col justify-center rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm",
      children: [
        jsx("p", {
          className: "font-display text-sm font-semibold",
          children: "Status Badge",
        }),
        jsx("p", {
          className: "mt-1 text-xs text-muted-foreground",
          children: "Pick an entity in settings.",
        }),
      ],
    });
  }

  if (!entity) {
    return jsxs("div", {
      className:
        "flex h-full min-h-28 flex-col justify-center rounded-2xl border border-dashed border-border bg-card p-4",
      children: [
        jsx("p", {
          className: "font-display text-sm font-semibold",
          children: entityId,
        }),
        jsx("p", {
          className: "mt-1 text-xs text-muted-foreground",
          children: "Unavailable",
        }),
      ],
    });
  }

  const on = entity.state === "on" || entity.state === "home" || entity.state === "open";

  return jsxs("div", {
    className:
      "flex h-full min-h-28 flex-col justify-center rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm",
    children: [
      jsx("p", {
        className: "text-[10px] uppercase tracking-[0.16em] text-muted-foreground",
        children: "Badge",
      }),
      jsx("p", {
        className: "mt-1 font-display text-base font-semibold",
        children: friendlyName(entity),
      }),
      jsxs("div", {
        className: "mt-3 inline-flex items-center gap-2",
        children: [
          jsx("span", {
            className: `h-2.5 w-2.5 rounded-full ${on ? "bg-success" : "bg-muted-foreground"}`,
          }),
          jsx("span", {
            className: "text-sm capitalize text-muted-foreground",
            children: entity.state,
          }),
        ],
      }),
    ],
  });
}

const badgeWidget = defineWidget({
  id: "@ethio/example-badge/status-badge",
  name: "Status Badge",
  description: "Compact entity status from a remote plugin",
  component: StatusBadge,
  configSchema,
  defaultConfig: { entity_id: "" },
  defaultSize: { w: 3, h: 2, minW: 2, minH: 2, maxW: 6, maxH: 4 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 6, h: 4 },
  entityDomains: ["light", "switch", "binary_sensor", "person", "input_boolean"],
  capabilities: ["entity.read"],
});

const plugin = definePlugin({
  id: "@ethio/example-badge",
  name: "Example Badge",
  widgets: [badgeWidget],
});

export { plugin };
export default plugin;
