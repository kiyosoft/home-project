import { Dialog } from "@/components/ui/dialog";
import { SchemaForm } from "@/components/SchemaForm";
import { CUSTOM_WIDGET_SETTINGS } from "@/components/widget-settings";
import { t } from "@/i18n";
import { useDashboardStore } from "@/store/dashboard-store";
import { useLocaleStore } from "@/store/locale-store";

export function WidgetSettingsDialog() {
  const locale = useLocaleStore((state) => state.locale);
  const open = useDashboardStore((state) => state.settingsOpen);
  const widgetId = useDashboardStore((state) => state.settingsWidgetId);
  const dashboard = useDashboardStore((state) => state.dashboard);
  const activePageId = useDashboardStore((state) => state.activePageId);
  const closeSettings = useDashboardStore((state) => state.closeSettings);
  const updateWidgetConfig = useDashboardStore(
    (state) => state.updateWidgetConfig,
  );

  const page = dashboard?.pages.find((p) => p.id === activePageId);
  const widget = page?.widgets.find((w) => w.id === widgetId);
  const CustomSettings = widget
    ? CUSTOM_WIDGET_SETTINGS[widget.type]
    : undefined;

  function handleSave(config: Record<string, unknown>) {
    if (!widget) return;
    updateWidgetConfig(widget.id, config);
    closeSettings();
  }

  return (
    <Dialog
      open={open && Boolean(widget)}
      onClose={closeSettings}
      title={t(locale, "widgetSettings.title")}
      description={widget ? `${widget.type} · ${widget.id}` : undefined}
      className={CustomSettings ? "max-w-2xl" : undefined}
    >
      {widget && CustomSettings ? (
        <CustomSettings
          config={widget.config}
          onCancel={closeSettings}
          onSave={handleSave}
        />
      ) : widget ? (
        <SchemaForm
          type={widget.type}
          config={widget.config}
          onCancel={closeSettings}
          onSave={handleSave}
        />
      ) : null}
    </Dialog>
  );
}
