import { entityImageUrl, withAuthToken } from "./media-auth";
import { carriesCredential, signPath } from "./signed-path";
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

/** Absolute MJPEG URL, with the camera's rotating `access_token` when present. */
export function cameraMjpegUrl(
  entityId: string,
  baseUrl: string,
  accessToken?: string | null,
): string | null {
  const resolved = entityImageUrl(cameraMjpegPath(entityId), baseUrl);
  if (!resolved) return null;
  return accessToken ? withAuthToken(resolved, accessToken) : resolved;
}

function parseStreamUrl(result: unknown): string {
  if (!result || typeof result !== "object" || !("url" in result)) {
    throw new Error("Camera stream response had no url");
  }
  const url = result.url;
  if (typeof url !== "string" || !url.trim()) {
    throw new Error("Camera stream response had no url");
  }
  return url.trim();
}

/**
 * Ask the hub to start (or reuse) an HLS playlist for a STREAM camera.
 * ONVIF and other RTSP cameras are remuxed by the stream component; the
 * returned path is what a player should load, not the camera's RTSP URL.
 */
export async function requestCameraStream(
  sendMessagePromise: <T>(message: Record<string, unknown>) => Promise<T>,
  entityId: string,
): Promise<string> {
  const result: unknown = await sendMessagePromise({
    type: "camera/stream",
    entity_id: entityId,
    format: "hls",
  });
  return parseStreamUrl(result);
}

/**
 * HLS playlist URL for a STREAM camera, signed when the hub path has no
 * credential of its own. MJPEG has no audio; this is the feed that does.
 */
export async function requestCameraHlsUrl(
  sendMessagePromise: <T>(message: Record<string, unknown>) => Promise<T>,
  entityId: string,
  baseUrl: string,
  expiresSeconds = 3600,
): Promise<string> {
  const path = await requestCameraStream(sendMessagePromise, entityId);
  const trimmed = path.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const base = baseUrl.replace(/\/+$/, "");
  if (!base) throw new Error("Camera stream URL could not be resolved");
  const relative = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (carriesCredential(relative)) return `${base}${relative}`;
  try {
    const signed = await signPath(sendMessagePromise, relative, expiresSeconds);
    return `${base}${signed}`;
  } catch {
    return `${base}${relative}`;
  }
}
