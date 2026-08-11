import type { HassEntity } from "./types";

/** Bit flags from homeassistant.components.camera.CameraEntityFeature */
export const CAMERA_FEATURE = {
  ON_OFF: 1,
  STREAM: 2,
} as const;

export function cameraSupportsFeature(
  supportedFeatures: number,
  bit: number,
): boolean {
  return (supportedFeatures & bit) !== 0;
}

function numAttr(
  attrs: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = attrs[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function strAttr(
  attrs: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = attrs[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

export interface CameraView {
  entityId: string;
  state: string;
  attributes: Record<string, unknown>;
  isOn: boolean;
  isStreaming: boolean;
  isRecording: boolean;
  isIdle: boolean;
  brand: string | undefined;
  model: string | undefined;
  accessToken: string | undefined;
  entityPicture: string | undefined;
  supportsOnOff: boolean;
  supportsStream: boolean;
}

export function deriveCamera(entity: HassEntity | undefined): CameraView | null {
  if (!entity) return null;
  const attrs = entity.attributes;
  const features = numAttr(attrs, "supported_features") ?? 0;
  const state = entity.state.toLowerCase();
  return {
    entityId: entity.entity_id,
    state: entity.state,
    attributes: attrs,
    isOn: state !== "off" && state !== "unavailable" && state !== "unknown",
    isStreaming: state === "streaming",
    isRecording: state === "recording",
    isIdle: state === "idle",
    brand: strAttr(attrs, "brand"),
    model: strAttr(attrs, "model"),
    accessToken: strAttr(attrs, "access_token"),
    entityPicture: strAttr(attrs, "entity_picture"),
    supportsOnOff: cameraSupportsFeature(features, CAMERA_FEATURE.ON_OFF),
    supportsStream: cameraSupportsFeature(features, CAMERA_FEATURE.STREAM),
  };
}

/** Build a camera still URL (prefer entity_picture, else camera_proxy). */
export function cameraStillPath(
  entityId: string,
  entityPicture?: string | null,
): string {
  if (entityPicture?.trim()) return entityPicture.trim();
  return `/api/camera_proxy/${entityId}`;
}

/** MJPEG stream path used by many HA cameras. */
export function cameraMjpegPath(entityId: string): string {
  return `/api/camera_proxy_stream/${entityId}`;
}
