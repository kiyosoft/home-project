import { webhookTargets } from "@/lib/webhook";
import { useHaStore } from "@/store/ha-store";

import {
  encodeWidgetHub,
  WIDGET_HUB_KEY,
} from "./hub-config";

export {
  encodeWidgetHub,
  parseWidgetHub,
  webhookBodyForTarget,
  WIDGET_HUB_KEY,
  type WidgetHubConfig,
} from "./hub-config";

/**
 * The widget extension POSTs to Home Assistant itself: JS is frozen once the
 * user is on the Home Screen, so a listener in the companion never runs.
 */
export async function syncWidgetHub(): Promise<void> {
  const { registration } = useHaStore.getState();
  if (!registration) {
    writeShared(WIDGET_HUB_KEY, null);
    return;
  }
  const urls = await webhookTargets();
  if (urls.length === 0) {
    writeShared(WIDGET_HUB_KEY, null);
    return;
  }
  writeShared(
    WIDGET_HUB_KEY,
    encodeWidgetHub({ webhookId: registration.webhookId, urls }),
  );
}

function writeShared(key: string, value: string | null): void {
  try {
    const expo = require("expo") as {
      requireNativeModule: <T>(name: string) => T;
    };
    const native = expo.requireNativeModule<{
      setSharedString?: (key: string, value: string) => void;
      removeSharedString?: (key: string) => void;
    }>("ExpoWidgets");
    if (value === null) native.removeSharedString?.(key);
    else native.setSharedString?.(key, value);
  } catch {
    // Tests and web have no widget module.
  }
}
