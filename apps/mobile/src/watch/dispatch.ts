import { hapticToggle } from "@/lib/haptics";
import { callServiceOnHub } from "@/lib/webhook";
import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";
import { entityDomain } from "@/store/use-entity";

import { defaultWatchEntityIds } from "./catalog";
import {
  UNASSIGNED_AREA_ID,
  isActivateDomain,
  isControllableDomain,
  isToggleDomain,
  type WatchCommand,
  type WatchCommandResult,
} from "./types";
import { useWatchStore } from "./watch-store";

export function dispatchWatchToggle(entityId: string): Promise<WatchCommandResult> {
  return dispatchWatchCommand({ kind: "toggle", entityId });
}

export function parseWatchCommand(
  payload: {
    kind?: unknown;
    entityId?: unknown;
    action?: unknown;
    areaId?: unknown;
    data?: unknown;
  } | null | undefined,
): WatchCommand | null {
  if (!payload || typeof payload !== "object") return null;
  const kind = payload.kind;
  const entityId =
    typeof payload.entityId === "string" ? payload.entityId : "";

  if (kind === "toggle" && entityId) return { kind: "toggle", entityId };
  if (kind === "activate" && entityId) return { kind: "activate", entityId };
  if (kind === "lock" && entityId) return { kind: "lock", entityId };
  if (kind === "unlock" && entityId) return { kind: "unlock", entityId };
  if (kind === "set" && entityId) {
    const data =
      payload.data && typeof payload.data === "object"
        ? (payload.data as Record<string, unknown>)
        : {};
    return { kind: "set", entityId, data };
  }
  if (kind === "group") {
    const action = payload.action;
    if (action !== "lights_off" && action !== "lights_on") return null;
    const areaId =
      typeof payload.areaId === "string" && payload.areaId
        ? payload.areaId
        : undefined;
    return { kind: "group", action, areaId };
  }
  return null;
}

export async function dispatchWatchCommand(
  command: WatchCommand,
): Promise<WatchCommandResult> {
  const result = await runWatchCommand(command);
  if (result.ok) hapticToggle();
  return result;
}

async function runWatchCommand(
  command: WatchCommand,
): Promise<WatchCommandResult> {
  if (command.kind === "group") {
    const ids = wristLightIds(command.areaId);
    if (ids.length === 0) return { ok: false };
    const service = command.action === "lights_on" ? "turn_on" : "turn_off";
    const ok = await sendCall("light", service, {
      entity_id: ids.length === 1 ? ids[0] : ids,
    });
    return { ok };
  }

  const entityId = command.entityId;
  const domain = entityDomain(entityId);
  if (!entityId || !isControllableDomain(domain)) return { ok: false };

  if (command.kind === "set") {
    if (domain !== "light") return { ok: false, entityId };
    const ok = await sendCall("light", "turn_on", {
      entity_id: entityId,
      ...command.data,
    });
    return { ok, entityId };
  }

  if (command.kind === "activate" || isActivateDomain(domain)) {
    if (!isActivateDomain(domain)) return { ok: false, entityId };
    const ok = await sendCall(domain, "turn_on", { entity_id: entityId });
    return { ok, entityId, state: ok ? "on" : undefined };
  }

  if (command.kind === "lock" || command.kind === "unlock" || domain === "lock") {
    if (domain !== "lock") return { ok: false, entityId };
    const service =
      command.kind === "lock" || command.kind === "unlock"
        ? command.kind
        : lockServiceForState(entityState(entityId));
    const ok = await sendCall("lock", service, { entity_id: entityId });
    const next =
      service === "lock" ? "locking" : service === "unlock" ? "unlocking" : undefined;
    return { ok, entityId, state: ok ? next : undefined };
  }

  if (command.kind === "toggle" || isToggleDomain(domain)) {
    if (!isToggleDomain(domain)) return { ok: false, entityId };
    const ok = await sendCall(domain, "toggle", { entity_id: entityId });
    return { ok, entityId };
  }

  return { ok: false, entityId };
}

function lockServiceForState(state: string): "lock" | "unlock" {
  return state === "locked" || state === "locking" ? "unlock" : "lock";
}

function entityState(entityId: string): string {
  return useHaStore.getState().entities[entityId]?.state ?? "";
}

function wristLightIds(areaId?: string): string[] {
  const { entities, areaByEntity } = useHaStore.getState();
  const selected = selectedWatchIds();
  const ids: string[] = [];
  for (const entityId of selected) {
    if (entityDomain(entityId) !== "light") continue;
    if (!entities[entityId]) continue;
    if (areaId) {
      const area = areaByEntity[entityId] ?? UNASSIGNED_AREA_ID;
      if (area !== areaId) continue;
    }
    ids.push(entityId);
  }
  return ids;
}

function selectedWatchIds(): string[] {
  const selected = useWatchStore.getState().entityIds;
  if (selected) return selected;
  const { entities } = useHaStore.getState();
  const document = useDashboardStore.getState().document;
  return defaultWatchEntityIds(document, entities);
}

async function sendCall(
  domain: string,
  service: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  const { callService } = useHaStore.getState();
  try {
    await callService(domain, service, data);
    return true;
  } catch {
    const delivery = await callServiceOnHub({
      domain,
      service,
      serviceData: data,
    });
    return delivery === "sent";
  }
}
