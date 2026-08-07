import { defineCommand } from "@ethio/plugin-sdk";

import { t } from "@/i18n";
import { THEME_IDS, type ThemeMode } from "@/lib/themes";
import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";
import { usePluginsUiStore } from "@/store/plugins-ui-store";
import { useThemeStore } from "@/store/theme-store";

const THEME_CYCLE: ThemeMode[] = [...THEME_IDS];

export function createPlatformCommands() {
  const locale = useLocaleStore.getState().locale;

  return [
    defineCommand({
      id: "platform.edit.enter",
      title: t(locale, "commands.editEnter"),
      subtitle: t(locale, "commands.editEnterSub"),
      keywords: ["edit", "builder", "customize"],
      run: () => {
        useDashboardStore.getState().requestEdit();
      },
    }),
    defineCommand({
      id: "platform.edit.exit",
      title: t(locale, "commands.editExit"),
      subtitle: t(locale, "commands.editExitSub"),
      keywords: ["done", "live", "exit"],
      run: () => {
        useDashboardStore.getState().setMode("live");
      },
    }),
    defineCommand({
      id: "platform.settings",
      title: t(locale, "commands.settings"),
      subtitle: t(locale, "commands.settingsSub"),
      keywords: ["settings", "pin", "kiosk"],
      run: () => {
        window.dispatchEvent(new CustomEvent("ethio:open-settings"));
      },
    }),
    defineCommand({
      id: "platform.plugins",
      title: t(locale, "commands.plugins"),
      subtitle: t(locale, "commands.pluginsSub"),
      keywords: ["plugins", "registry", "install", "hub"],
      run: () => {
        usePluginsUiStore.getState().openPlugins();
      },
    }),
    defineCommand({
      id: "platform.theme.toggle",
      title: t(locale, "commands.theme"),
      subtitle: t(locale, "commands.themeSub"),
      keywords: ["theme", "dark", "light", "appearance"],
      run: () => {
        const { theme, setTheme } = useThemeStore.getState();
        const index = THEME_CYCLE.indexOf(theme);
        const next = THEME_CYCLE[(index + 1) % THEME_CYCLE.length] ?? "light";
        setTheme(next);
      },
    }),
    defineCommand({
      id: "platform.disconnect",
      title: t(locale, "commands.disconnect"),
      subtitle: t(locale, "commands.disconnectSub"),
      keywords: ["logout", "disconnect", "setup"],
      run: () => {
        useHaStore.getState().disconnect({ clearSaved: true });
      },
    }),
    defineCommand({
      id: "platform.picker",
      title: t(locale, "commands.addWidget"),
      subtitle: t(locale, "commands.addWidgetSub"),
      keywords: ["add", "widget", "picker"],
      run: () => {
        const store = useDashboardStore.getState();
        if (store.mode !== "edit") {
          store.requestEdit();
        }
        // defer picker until edit unlock completes via PIN
        queueMicrotask(() => {
          const next = useDashboardStore.getState();
          if (next.mode === "edit") next.openPicker();
        });
      },
    }),
  ];
}

export function createPageCommands() {
  const dashboard = useDashboardStore.getState().dashboard;
  if (!dashboard) return [];
  const locale = useLocaleStore.getState().locale;

  return dashboard.pages.map((page) =>
    defineCommand({
      id: `platform.page.${page.id}`,
      title: t(locale, "commands.goToPage", { title: page.title }),
      subtitle: t(locale, "commands.switchPage"),
      keywords: ["page", "go", page.title, page.id],
      run: () => {
        useDashboardStore.getState().setActivePage(page.id);
      },
    }),
  );
}
