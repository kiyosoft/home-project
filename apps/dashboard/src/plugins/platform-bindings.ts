import {
  createPlatformBindings,
  notifyEntityStoreChanged,
} from "@ethio/plugin-sdk";

import { pluginHasCapability } from "@/plugins/manager";
import { loadConnectionSettings } from "@/lib/settings";
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
    getAuthToken: () => {
      const saved = loadConnectionSettings();
      return saved?.mode === "live" ? saved.token : "";
    },
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
