import {
  safeParseMobileDashboard,
  type MobileDashboard,
} from "@ethio/mobile-schema";
import { create } from "zustand";

import {
  clearRoomsDocument,
  loadRoomsDocument,
  saveRoomsDocument,
} from "@/lib/settings";

export type RoomsEditorMode = "live" | "edit";

interface RoomsState {
  /** Null means every room is still a live area query. */
  document: MobileDashboard | null;
  hydrated: boolean;
  mode: RoomsEditorMode;
  setMode: (mode: RoomsEditorMode) => void;
  hydrate: () => void;
  save: (document: MobileDashboard) => void;
  reset: () => void;
}

function readDocument(): MobileDashboard | null {
  const raw = loadRoomsDocument();
  const parsed = raw ? safeParseMobileDashboard(raw) : null;
  return parsed?.success ? parsed.data : null;
}

export const useRoomsStore = create<RoomsState>((set) => ({
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
    saveRoomsDocument(document);
  },

  reset() {
    set({ document: null, mode: "live" });
    clearRoomsDocument();
  },
}));
