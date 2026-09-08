export const WATCH_GESTURE_EVENT = "ethio_watch_gesture";

export const WATCH_GESTURES = ["double_snap", "shake", "flick"] as const;

export type WatchGesture = (typeof WATCH_GESTURES)[number];

/** Keep in lockstep with SnapDetector.swift. */
export const GESTURE_THRESHOLDS = {
  snapMag: 0.28,
  snapRise: 0.16,
  snapMinInterval: 0.55,
  doubleSnapMin: 0.45,
  doubleSnapMax: 0.9,
  walkBusyMag: 0.22,
  walkBusyCount: 8,
  shakeWindow: 0.5,
  shakePeakMag: 0.35,
  shakePeaks: 3,
  flickRate: 4,
  flickMaxAccel: 1.2,
  gestureCooldown: 1,
} as const;

export function isWatchGesture(value: unknown): value is WatchGesture {
  return (
    typeof value === "string" &&
    (WATCH_GESTURES as readonly string[]).includes(value)
  );
}

export function isWalking(recentMags: number[]): boolean {
  let busy = 0;
  for (const mag of recentMags) {
    if (mag > GESTURE_THRESHOLDS.walkBusyMag) busy += 1;
  }
  return busy >= GESTURE_THRESHOLDS.walkBusyCount;
}

export function isSnapSpike(options: {
  mag: number;
  rise: number;
  secondsSinceFire: number;
  walking: boolean;
}): boolean {
  if (options.walking) return false;
  return (
    options.mag > GESTURE_THRESHOLDS.snapMag &&
    options.rise > GESTURE_THRESHOLDS.snapRise &&
    options.secondsSinceFire > GESTURE_THRESHOLDS.snapMinInterval
  );
}

export function isDoubleSnap(secondsSinceSingle: number): boolean {
  return (
    secondsSinceSingle >= GESTURE_THRESHOLDS.doubleSnapMin &&
    secondsSinceSingle <= GESTURE_THRESHOLDS.doubleSnapMax
  );
}

export function shakePeakCount(mags: number[], peakMag: number): number {
  let peaks = 0;
  for (let index = 1; index < mags.length - 1; index += 1) {
    const mag = mags[index] ?? 0;
    if (mag < peakMag) continue;
    if (mag >= (mags[index - 1] ?? 0) && mag >= (mags[index + 1] ?? 0)) {
      peaks += 1;
    }
  }
  return peaks;
}

export function isShake(options: {
  mags: number[];
  walking: boolean;
}): boolean {
  if (options.walking) return false;
  return (
    shakePeakCount(options.mags, GESTURE_THRESHOLDS.shakePeakMag) >=
    GESTURE_THRESHOLDS.shakePeaks
  );
}

export function isFlick(options: {
  rotationRate: number;
  accelMag: number;
}): boolean {
  return (
    Math.abs(options.rotationRate) > GESTURE_THRESHOLDS.flickRate &&
    options.accelMag < GESTURE_THRESHOLDS.flickMaxAccel
  );
}

export interface WatchGestureEventData {
  gesture: WatchGesture;
  source: "watch";
  at_home: boolean;
  area_id: string;
  device_id: string;
}

export function buildWatchGestureEventData(options: {
  gesture: WatchGesture;
  atHome: boolean;
  areaId: string;
  deviceId: string;
}): WatchGestureEventData {
  return {
    gesture: options.gesture,
    source: "watch",
    at_home: options.atHome,
    area_id: options.areaId,
    device_id: options.deviceId,
  };
}
