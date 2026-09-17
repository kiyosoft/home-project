import {
  safeParseMobileDashboard,
  type MobileDashboard,
} from "@ethio/mobile-schema";
import { create } from "zustand";

import {
  clearDashboardDocument,
  loadDashboardDocument,
  saveDashboardDocument,
} from "@/lib/settings";

export type EditorMode = "live" | "edit";

interface DashboardState {
  /** Null means "no saved document", so the empty default is used instead. */
  document: MobileDashboard | null;
  hydrated: boolean;
  /** Shared by the Home header and the grid so both agree on the chrome. */
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  hydrate: () => void;
  save: (document: MobileDashboard) => void;
  reset: () => void;
}

function readDocument(): MobileDashboard | null {
  const raw = loadDashboardDocument();
  const parsed = raw ? safeParseMobileDashboard(raw) : null;
  return parsed?.success ? parsed.data : null;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  document: readDocument(),
  hydrated: true,
  mode: "live",

  setMode(mode) {
    set({ mode });
  },

  hydrate() {
    set({ document: readDocument(), hydrated: true });
  },

  save(document) {
    set({ document });
    saveDashboardDocument(document);
  },

  reset() {
    set({ document: null, mode: "live" });
    clearDashboardDocument();
  },
}));
