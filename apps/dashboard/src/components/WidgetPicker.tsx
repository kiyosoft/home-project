import { useMemo } from "react";

import { Dialog } from "@/components/ui/dialog";
import type { Breakpoint } from "@/dashboard/types";
import { t } from "@/i18n";
import { listWidgets } from "@/plugins/registry";
import { useDashboardStore } from "@/store/dashboard-store";
import { useLocaleStore } from "@/store/locale-store";
import { usePluginsUiStore } from "@/store/plugins-ui-store";

interface WidgetPickerProps {
  breakpoint: Breakpoint;
}

export function WidgetPicker({ breakpoint }: WidgetPickerProps) {
  const locale = useLocaleStore((state) => state.locale);
  const open = useDashboardStore((state) => state.pickerOpen);
  const closePicker = useDashboardStore((state) => state.closePicker);
  const addWidget = useDashboardStore((state) => state.addWidget);
  const revision = usePluginsUiStore((state) => state.revision);
  const widgets = useMemo(() => listWidgets(), [revision]);

  return (
    <Dialog
      open={open}
      onClose={closePicker}
      title={t(locale, "picker.title")}
      description={t(locale, "picker.description")}
    >
      <ul className="space-y-2">
        {widgets.map((widget) => (
          <li key={widget.id}>
            <button
              type="button"
              className="flex w-full flex-col items-start rounded-xl border border-border px-4 py-3 text-left hover:bg-muted"
              onClick={() => addWidget(widget.id, breakpoint)}
            >
              <span className="font-medium">{widget.name}</span>
              <span className="text-sm text-muted-foreground">
                {widget.description}
              </span>
              <span className="mt-1 text-[11px] text-muted-foreground/80">
                {widget.id}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
