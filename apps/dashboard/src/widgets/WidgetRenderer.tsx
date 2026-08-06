import { PluginScope } from "@ethio/plugin-sdk";

import type { DashboardWidget } from "@/dashboard/types";
import { getWidget } from "@/plugins/registry";

interface WidgetRendererProps {
  widget: DashboardWidget;
  interactive?: boolean;
}

export function WidgetRenderer({
  widget,
  interactive = true,
}: WidgetRendererProps) {
  const def = getWidget(widget.type);

  if (!def) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-dashed border-border bg-card p-5">
        <h3 className="font-display text-base font-semibold">Unknown widget</h3>
        <p className="mt-2 text-sm text-muted-foreground">{widget.type}</p>
      </div>
    );
  }

  const Component = def.component;

  return (
    <PluginScope pluginId={def.pluginId}>
      <Component config={widget.config} interactive={interactive} />
    </PluginScope>
  );
}
