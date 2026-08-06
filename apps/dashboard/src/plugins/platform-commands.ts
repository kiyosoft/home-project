import { defineCommand } from "@ethio/plugin-sdk";

import { THEME_IDS, type ThemeMode } from "@/lib/themes";
import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";
import { usePluginsUiStore } from "@/store/plugins-ui-store";
import { useThemeStore } from "@/store/theme-store";

const THEME_CYCLE: ThemeMode[] = [...THEME_IDS];

export function createPlatformCommands() {
  return [
    defineCommand({
      id: "platform.edit.enter",
      title: "Enter edit mode",
      subtitle: "Customize the dashboard layout",
      keywords: ["edit", "builder", "customize"],
      run: () => {
        useDashboardStore.getState().requestEdit();
      },
    }),
    defineCommand({
      id: "platform.edit.exit",
      title: "Exit edit mode",
      subtitle: "Return to live view",
      keywords: ["done", "live", "exit"],
      run: () => {
        useDashboardStore.getState().setMode("live");
      },
    }),
    defineCommand({
      id: "platform.settings",
      title: "Open settings",
      subtitle: "PIN, kiosk, and dashboard options",
      keywords: ["settings", "pin", "kiosk"],
      run: () => {
        window.dispatchEvent(new CustomEvent("ethio:open-settings"));
      },
    }),
    defineCommand({
      id: "platform.plugins",
      title: "Open plugins",
      subtitle: "Browse and install registry plugins",
      keywords: ["plugins", "registry", "install", "hub"],
      run: () => {
        usePluginsUiStore.getState().openPlugins();
      },
    }),
    defineCommand({
      id: "platform.theme.toggle",
      title: "Cycle theme",
      subtitle: "Cycle Default, Atmosphere, SCIFICN, and tweakcn themes",
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
      title: "Disconnect",
      subtitle: "Return to connection setup",
      keywords: ["logout", "disconnect", "setup"],
      run: () => {
        useHaStore.getState().disconnect({ clearSaved: true });
      },
    }),
    defineCommand({
      id: "platform.picker",
      title: "Add widget",
      subtitle: "Open the widget picker",
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

  return dashboard.pages.map((page) =>
    defineCommand({
      id: `platform.page.${page.id}`,
      title: `Go to ${page.title}`,
      subtitle: "Switch page",
      keywords: ["page", "go", page.title, page.id],
      run: () => {
        useDashboardStore.getState().setActivePage(page.id);
      },
    }),
  );
}
