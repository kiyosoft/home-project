import type { RegisteredWidget } from "@ethio/plugin-sdk";

const widgets = new Map<string, RegisteredWidget>();

/** Short IDs used by Phase 2 saved dashboards → namespaced plugin widget ids */
const ALIASES: Record<string, string> = {
  "entity-state": "@ethio/core/entity-state",
  toggle: "@ethio/core/toggle",
};

export function resolveWidgetType(type: string): string {
  return ALIASES[type] ?? type;
}

export function registerWidget(widget: RegisteredWidget): void {
  if (widgets.has(widget.id)) {
    throw new Error(`Duplicate widget id: ${widget.id}`);
  }
  widgets.set(widget.id, widget);
}

export function unregisterWidgetsByPlugin(pluginId: string): void {
  for (const [id, widget] of widgets) {
    if (widget.pluginId === pluginId) {
      widgets.delete(id);
    }
  }
}

export function getWidget(type: string): RegisteredWidget | undefined {
  return widgets.get(resolveWidgetType(type));
}

export function getWidgetOrThrow(type: string): RegisteredWidget {
  const widget = getWidget(type);
  if (!widget) {
    throw new Error(`Unknown widget type: ${type}`);
  }
  return widget;
}

export function listWidgets(): RegisteredWidget[] {
  return [...widgets.values()];
}

export function clearWidgetRegistry(): void {
  widgets.clear();
}
