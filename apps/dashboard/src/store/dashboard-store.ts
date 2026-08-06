import type { HassEntities } from "@ethio/ha-sdk";
import { create } from "zustand";

import {
  createLayoutItem,
  emptyLayouts,
  newId,
} from "@/dashboard/layout";
import { safeParseDashboardConfig } from "@/dashboard/schemas";
import { seedDemoDashboard, seedLiveDashboard } from "@/dashboard/seed";
import type {
  Breakpoint,
  DashboardConfig,
  DashboardHeaderConfig,
  DashboardPage,
  DashboardWidget,
  EditorMode,
  GridItem,
  WidgetType,
} from "@/dashboard/types";
import { BREAKPOINT_ORDER } from "@/dashboard/types";
import { hashPin, verifyPin } from "@/lib/pin";
import {
  loadDashboard,
  loadLockSettings,
  saveDashboard,
  saveLockSettings,
} from "@/lib/settings";
import { getWidgetOrThrow } from "@/plugins/registry";

let saveTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleSave(dashboard: DashboardConfig) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveDashboard(dashboard);
  }, 150);
}

function persistLock(pinHash: string | null, kiosk: boolean) {
  saveLockSettings({ pinHash, kiosk });
}

function updatePage(
  dashboard: DashboardConfig,
  pageId: string,
  updater: (page: DashboardPage) => DashboardPage,
): DashboardConfig {
  return {
    ...dashboard,
    pages: dashboard.pages.map((page) =>
      page.id === pageId ? updater(page) : page,
    ),
  };
}

interface DashboardState {
  dashboard: DashboardConfig | null;
  activePageId: string | null;
  mode: EditorMode;
  selectedWidgetId: string | null;
  settingsWidgetId: string | null;
  pickerOpen: boolean;
  settingsOpen: boolean;
  pinDialog: null | "edit" | "settings" | "exit-kiosk" | "set-pin";
  pinHash: string | null;
  unlocked: boolean;
  kiosk: boolean;
  banner: string | null;
  hydrated: boolean;

  hydrate: (opts: {
    connectionMode: "live" | "demo" | null;
    entities: HassEntities;
  }) => void;
  setBanner: (message: string | null) => void;
  setMode: (mode: EditorMode) => void;
  requestEdit: () => void;
  setActivePage: (pageId: string) => void;
  addPage: (title?: string) => void;
  renamePage: (pageId: string, title: string) => void;
  removePage: (pageId: string) => void;
  setLayouts: (breakpoint: Breakpoint, layout: GridItem[]) => void;
  addWidget: (type: WidgetType, breakpoint: Breakpoint) => void;
  removeWidget: (widgetId: string) => void;
  updateWidgetConfig: (
    widgetId: string,
    config: Record<string, unknown>,
  ) => void;
  setSelectedWidgetId: (id: string | null) => void;
  openPicker: () => void;
  closePicker: () => void;
  openSettings: (widgetId: string) => void;
  closeSettings: () => void;
  exportJSON: () => string;
  importJSON: (raw: string) => { ok: true } | { ok: false; error: string };
  openPinDialog: (
    reason: "edit" | "settings" | "exit-kiosk" | "set-pin",
  ) => void;
  closePinDialog: () => void;
  submitPin: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  clearPin: () => void;
  setKiosk: (kiosk: boolean) => void;
  setCardsOnly: (cardsOnly: boolean) => void;
  setDashboardTitle: (title: string) => void;
  updateHeader: (patch: Partial<DashboardHeaderConfig>) => void;
  exitKiosk: () => void;
  resetSession: () => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  dashboard: null,
  activePageId: null,
  mode: "live",
  selectedWidgetId: null,
  settingsWidgetId: null,
  pickerOpen: false,
  settingsOpen: false,
  pinDialog: null,
  pinHash: null,
  unlocked: false,
  kiosk: false,
  banner: null,
  hydrated: false,

  hydrate({ connectionMode, entities }) {
    const lock = loadLockSettings();
    const saved = loadDashboard();

    if (!saved) {
      // Wait for live entities before seeding a first-run layout
      if (
        connectionMode === "live" &&
        Object.keys(entities).length === 0
      ) {
        set({
          pinHash: lock.pinHash,
          kiosk: lock.kiosk,
          unlocked: !lock.pinHash,
        });
        return;
      }

      const dashboard =
        connectionMode === "demo"
          ? seedDemoDashboard()
          : seedLiveDashboard(entities);
      saveDashboard(dashboard);
      set({
        dashboard,
        activePageId: dashboard.pages[0]?.id ?? null,
        pinHash: lock.pinHash,
        kiosk: lock.kiosk,
        unlocked: !lock.pinHash,
        hydrated: true,
        mode: "live",
      });
      return;
    }

    set({
      dashboard: saved,
      activePageId: saved.pages[0]?.id ?? null,
      pinHash: lock.pinHash,
      kiosk: lock.kiosk,
      unlocked: !lock.pinHash,
      hydrated: true,
      mode: "live",
    });
  },

  setBanner(message) {
    set({ banner: message });
  },

  setMode(mode) {
    set({
      mode,
      selectedWidgetId: null,
      pickerOpen: false,
      settingsOpen: mode === "edit" ? get().settingsOpen : false,
    });
  },

  requestEdit() {
    const { pinHash, unlocked } = get();
    if (pinHash && !unlocked) {
      set({ pinDialog: "edit" });
      return;
    }
    set({ mode: "edit" });
  },

  setActivePage(pageId) {
    set({ activePageId: pageId, selectedWidgetId: null });
  },

  addPage(title = "New page") {
    const { dashboard } = get();
    if (!dashboard) return;
    const page: DashboardPage = {
      id: newId("page"),
      title,
      layouts: emptyLayouts(),
      widgets: [],
    };
    const next = { ...dashboard, pages: [...dashboard.pages, page] };
    scheduleSave(next);
    set({ dashboard: next, activePageId: page.id });
  },

  renamePage(pageId, title) {
    const { dashboard } = get();
    if (!dashboard) return;
    const next = updatePage(dashboard, pageId, (page) => ({
      ...page,
      title: title.trim() || page.title,
    }));
    scheduleSave(next);
    set({ dashboard: next });
  },

  removePage(pageId) {
    const { dashboard, activePageId } = get();
    if (!dashboard || dashboard.pages.length <= 1) return;
    const pages = dashboard.pages.filter((p) => p.id !== pageId);
    const next = { ...dashboard, pages };
    scheduleSave(next);
    set({
      dashboard: next,
      activePageId:
        activePageId === pageId ? (pages[0]?.id ?? null) : activePageId,
    });
  },

  setLayouts(breakpoint, layout) {
    const { dashboard, activePageId } = get();
    if (!dashboard || !activePageId) return;
    const next = updatePage(dashboard, activePageId, (page) => ({
      ...page,
      layouts: {
        ...page.layouts,
        [breakpoint]: layout.map((item) => ({ ...item })),
      },
    }));
    scheduleSave(next);
    set({ dashboard: next });
  },

  addWidget(type, breakpoint) {
    const { dashboard, activePageId } = get();
    if (!dashboard || !activePageId) return;
    const def = getWidgetOrThrow(type);
    const id = newId("w");
    const widget: DashboardWidget = {
      id,
      type,
      config: { ...def.defaultConfig },
    };

    const next = updatePage(dashboard, activePageId, (page) => {
      const layouts = { ...page.layouts };
      for (const bp of BREAKPOINT_ORDER) {
        const item = createLayoutItem(
          id,
          layouts[bp],
          {
            ...def.defaultSize,
            minW: def.minSize.w,
            minH: def.minSize.h,
            maxW: def.maxSize.w,
            maxH: def.maxSize.h,
          },
          bp,
        );
        // Prefer free slot on the active breakpoint; mirror size elsewhere
        if (bp === breakpoint) {
          layouts[bp] = [...layouts[bp], item];
        } else {
          const mirrored = createLayoutItem(
            id,
            layouts[bp],
            {
              ...def.defaultSize,
              minW: def.minSize.w,
              minH: def.minSize.h,
              maxW: def.maxSize.w,
              maxH: def.maxSize.h,
            },
            bp,
          );
          layouts[bp] = [...layouts[bp], mirrored];
        }
      }
      return {
        ...page,
        widgets: [...page.widgets, widget],
        layouts,
      };
    });

    scheduleSave(next);
    set({
      dashboard: next,
      pickerOpen: false,
      settingsWidgetId: id,
      settingsOpen: true,
    });
  },

  removeWidget(widgetId) {
    const { dashboard, activePageId } = get();
    if (!dashboard || !activePageId) return;
    const next = updatePage(dashboard, activePageId, (page) => ({
      ...page,
      widgets: page.widgets.filter((w) => w.id !== widgetId),
      layouts: {
        lg: page.layouts.lg.filter((i) => i.i !== widgetId),
        md: page.layouts.md.filter((i) => i.i !== widgetId),
        sm: page.layouts.sm.filter((i) => i.i !== widgetId),
      },
    }));
    scheduleSave(next);
    set({
      dashboard: next,
      selectedWidgetId: null,
      settingsOpen: false,
      settingsWidgetId: null,
    });
  },

  updateWidgetConfig(widgetId, config) {
    const { dashboard, activePageId } = get();
    if (!dashboard || !activePageId) return;
    const next = updatePage(dashboard, activePageId, (page) => ({
      ...page,
      widgets: page.widgets.map((w) =>
        w.id === widgetId ? { ...w, config } : w,
      ),
    }));
    scheduleSave(next);
    set({ dashboard: next });
  },

  setSelectedWidgetId(id) {
    set({ selectedWidgetId: id });
  },

  openPicker() {
    set({ pickerOpen: true });
  },

  closePicker() {
    set({ pickerOpen: false });
  },

  openSettings(widgetId) {
    set({ settingsWidgetId: widgetId, settingsOpen: true });
  },

  closeSettings() {
    set({ settingsOpen: false, settingsWidgetId: null });
  },

  exportJSON() {
    const { dashboard } = get();
    return JSON.stringify(dashboard, null, 2);
  },

  importJSON(raw) {
    try {
      const parsed = safeParseDashboardConfig(JSON.parse(raw));
      if (!parsed.success) {
        return {
          ok: false as const,
          error: parsed.error.issues[0]?.message ?? "Invalid dashboard JSON",
        };
      }
      scheduleSave(parsed.data);
      set({
        dashboard: parsed.data,
        activePageId: parsed.data.pages[0]?.id ?? null,
        mode: "live",
        banner: null,
      });
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: "Could not parse JSON file" };
    }
  },

  openPinDialog(reason) {
    set({ pinDialog: reason });
  },

  closePinDialog() {
    set({ pinDialog: null });
  },

  async submitPin(pin) {
    const { pinHash, pinDialog } = get();
    const ok = await verifyPin(pin, pinHash);
    if (!ok) return false;

    if (pinDialog === "edit") {
      set({ unlocked: true, mode: "edit", pinDialog: null });
    } else if (pinDialog === "settings") {
      set({ unlocked: true, pinDialog: null });
    } else if (pinDialog === "exit-kiosk") {
      set({ unlocked: true, kiosk: false, pinDialog: null });
      persistLock(get().pinHash, false);
    } else {
      set({ unlocked: true, pinDialog: null });
    }
    return true;
  },

  async setPin(pin) {
    const pinHash = await hashPin(pin);
    persistLock(pinHash, get().kiosk);
    set({ pinHash, unlocked: true, pinDialog: null });
  },

  clearPin() {
    persistLock(null, get().kiosk);
    set({ pinHash: null, unlocked: true });
  },

  setKiosk(kiosk) {
    persistLock(get().pinHash, kiosk);
    set({
      kiosk,
      mode: kiosk ? "live" : get().mode,
      pickerOpen: false,
      settingsOpen: false,
    });
  },

  setCardsOnly(cardsOnly) {
    const { dashboard } = get();
    if (!dashboard) return;
    const next = { ...dashboard, cardsOnly };
    scheduleSave(next);
    set({ dashboard: next });
  },

  setDashboardTitle(title) {
    const { dashboard } = get();
    if (!dashboard) return;
    const next = { ...dashboard, title: title.trim() || dashboard.title };
    scheduleSave(next);
    set({ dashboard: next });
  },

  updateHeader(patch) {
    const { dashboard } = get();
    if (!dashboard) return;
    const next = {
      ...dashboard,
      header: {
        ...dashboard.header,
        ...patch,
      },
    };
    scheduleSave(next);
    set({ dashboard: next });
  },

  exitKiosk() {
    const { pinHash } = get();
    if (pinHash) {
      set({ pinDialog: "exit-kiosk" });
      return;
    }
    persistLock(pinHash, false);
    set({ kiosk: false });
  },

  resetSession() {
    set({
      hydrated: false,
      mode: "live",
      pickerOpen: false,
      settingsOpen: false,
      selectedWidgetId: null,
      settingsWidgetId: null,
    });
  },
}));
