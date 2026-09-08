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
  hydrate: () => Promise<void>;
  setEntityIds: (ids: string[]) => void;
  toggleEntity: (entityId: string, on: boolean) => void;
  setArea: (areaId: string) => void;
  setAtHome: (atHome: boolean) => void;
  setStatus: (status: WatchNativeStatus) => void;
  setModel: (model: WatchModelDevice[]) => void;
}

export const useWatchStore = create<WatchState>((set, get) => ({
  hydrated: false,
  entityIds: null,
  currentAreaId: "",
  atHome: true,
  status: EMPTY_WATCH_STATUS,
  model: [],

  async hydrate() {
    const [entityIds, currentAreaId, atHome] = await Promise.all([
      loadWatchEntityIds(),
      loadWatchAreaId(),
      loadAtHome(),
    ]);
    set({
      entityIds,
      currentAreaId,
      atHome: atHome ?? true,
      hydrated: true,
    });
  },

  setEntityIds(entityIds) {
    set({ entityIds });
    void saveWatchEntityIds(entityIds);
  },

  toggleEntity(entityId, on) {
    const current = get().entityIds ?? [];
    const next = on
      ? current.includes(entityId)
        ? current
        : [...current, entityId]
      : current.filter((id) => id !== entityId);
    set({ entityIds: next });
    void saveWatchEntityIds(next);
  },

  setArea(currentAreaId) {
    set({ currentAreaId });
    void saveWatchAreaId(currentAreaId);
  },

  setAtHome(atHome) {
    set({ atHome });
    void saveAtHome(atHome);
  },

  setStatus(status) {
    set({ status });
  },

  setModel(model) {
    set({ model });
  },
}));
