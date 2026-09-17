import { create } from "zustand";

import {
  EMPTY_WATCH_STATUS,
  type WatchModelDevice,
  type WatchNativeStatus,
} from "./native";
import {
  loadAtHome,
  loadWatchAreaId,
  loadWatchEntityIds,
  saveAtHome,
  saveWatchAreaId,
  saveWatchEntityIds,
} from "./settings";

interface WatchState {
  hydrated: boolean;
  /** Null means "use dashboard favourites". */
  entityIds: string[] | null;
  currentAreaId: string;
  atHome: boolean;
  status: WatchNativeStatus;
  model: WatchModelDevice[];
  hydrate: () => void;
  setEntityIds: (ids: string[]) => void;
  toggleEntity: (entityId: string, on: boolean) => void;
  setArea: (areaId: string) => void;
  setAtHome: (atHome: boolean) => void;
  setStatus: (status: WatchNativeStatus) => void;
  setModel: (model: WatchModelDevice[]) => void;
}

export const useWatchStore = create<WatchState>((set, get) => ({
  hydrated: true,
  entityIds: loadWatchEntityIds(),
  currentAreaId: loadWatchAreaId(),
  atHome: loadAtHome() ?? true,
  status: EMPTY_WATCH_STATUS,
  model: [],

  hydrate() {
    set({
      entityIds: loadWatchEntityIds(),
      currentAreaId: loadWatchAreaId(),
      atHome: loadAtHome() ?? true,
      hydrated: true,
    });
  },

  setEntityIds(entityIds) {
    set({ entityIds });
    saveWatchEntityIds(entityIds);
  },

  toggleEntity(entityId, on) {
    const current = get().entityIds ?? [];
    const next = on
      ? current.includes(entityId)
        ? current
        : [...current, entityId]
      : current.filter((id) => id !== entityId);
    set({ entityIds: next });
    saveWatchEntityIds(next);
  },

  setArea(currentAreaId) {
    set({ currentAreaId });
    saveWatchAreaId(currentAreaId);
  },

  setAtHome(atHome) {
    set({ atHome });
    saveAtHome(atHome);
  },

  setStatus(status) {
    set({ status });
  },

  setModel(model) {
    set({ model });
  },
}));
