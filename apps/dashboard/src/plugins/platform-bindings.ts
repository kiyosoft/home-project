import {
  createPlatformBindings,
  notifyEntityStoreChanged,
} from "@ethio/plugin-sdk";

import { pluginHasCapability } from "@/plugins/manager";
import { liveAccessToken } from "@/lib/settings";
import {
  dashboardTemplateVariables,
  refreshTemplateVariables,
  snapshotPreviousPeople,
} from "@/lib/template-variables";
import { useHaStore } from "@/store/ha-store";

let wired = false;

/** Wire HA store into plugin-sdk once at app bootstrap. */
export function wirePlatformBindings(): void {
  if (wired) return;
  wired = true;

  createPlatformBindings({
    getEntity: (entityId) => useHaStore.getState().entities[entityId],
    getEntities: () => useHaStore.getState().entities,
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
      state.baseUrl !== prev.baseUrl ||
      state.userId !== prev.userId ||
      state.userName !== prev.userName
    ) {
      refreshTemplateVariables();
      notifyEntityStoreChanged();
    }
  });
}
