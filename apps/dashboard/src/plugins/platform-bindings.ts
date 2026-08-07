import {
  createPlatformBindings,
  notifyEntityStoreChanged,
} from "@ethio/plugin-sdk";

import { pluginHasCapability } from "@/plugins/manager";
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
    getBaseUrl: () => useHaStore.getState().baseUrl,
    hasCapability: pluginHasCapability,
  });

  useHaStore.subscribe((state, prev) => {
    if (
      state.entities !== prev.entities ||
      state.baseUrl !== prev.baseUrl
    ) {
      notifyEntityStoreChanged();
    }
  });
}
