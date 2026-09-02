import {
  createPlatformBindings,
  notifyEntityStoreChanged,
} from "@ethio/plugin-sdk";
import type { AreaIndex } from "@ethio/ha-sdk";

import { pluginHasCapability } from "@/plugins/manager";
import { liveAccessToken } from "@/lib/settings";
import {
  dashboardTemplateVariables,
  refreshTemplateVariables,
  snapshotPreviousPeople,
} from "@/lib/template-variables";
import { useHaStore } from "@/store/ha-store";

let wired = false;
let areaIndex: AreaIndex = { areas: [], areaByEntity: {} };

/** Wire HA store into plugin-sdk once at app bootstrap. */
export function wirePlatformBindings(): void {
  if (wired) return;
  wired = true;

  createPlatformBindings({
    getEntity: (entityId) => useHaStore.getState().entities[entityId],
    getEntities: () => useHaStore.getState().entities,
    getAreaIndex: () => {
      const state = useHaStore.getState();
      if (
        areaIndex.areas !== state.areas ||
        areaIndex.areaByEntity !== state.areaByEntity
      ) {
        areaIndex = {
          areas: state.areas,
          areaByEntity: state.areaByEntity,
        };
      }
      return areaIndex;
    },
    callService: (domain, service, data) =>
      useHaStore.getState().callService(domain, service, data),
    sendMessagePromise: (message) =>
      useHaStore.getState().sendMessagePromise(message),
    subscribeMessage: (message, onMessage) =>
      useHaStore.getState().subscribeMessage(message, onMessage),
    getBaseUrl: () => useHaStore.getState().baseUrl,
    getAuthToken: liveAccessToken,
    hasCapability: pluginHasCapability,
    getTemplateVariables: dashboardTemplateVariables,
  });

  useHaStore.subscribe((state, prev) => {
    if (state.entities !== prev.entities) {
      snapshotPreviousPeople(prev.entities);
    }
    if (
      state.entities !== prev.entities ||
      state.areas !== prev.areas ||
      state.areaByEntity !== prev.areaByEntity ||
      state.baseUrl !== prev.baseUrl ||
      state.userId !== prev.userId ||
      state.userName !== prev.userName
    ) {
      refreshTemplateVariables();
      notifyEntityStoreChanged();
    }
  });
}
