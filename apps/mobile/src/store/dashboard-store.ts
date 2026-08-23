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

interface DashboardState {
  /** Null means "no saved document", so the generated default is used instead. */
  document: MobileDashboard | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  save: (document: MobileDashboard) => Promise<void>;
  reset: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  document: null,
  hydrated: false,

  async hydrate() {
    const raw = await loadDashboardDocument();
    // A document written by a newer build may no longer parse; fall back rather than crash.
    const parsed = raw ? safeParseMobileDashboard(raw) : null;
    set({ document: parsed?.success ? parsed.data : null, hydrated: true });
  },

  async save(document) {
    set({ document });
    await saveDashboardDocument(document);
  },

  async reset() {
    set({ document: null });
    await clearDashboardDocument();
  },
}));
