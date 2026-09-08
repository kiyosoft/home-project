import { describe, expect, it } from "vitest";

import {
  GESTURE_THRESHOLDS,
  buildWatchGestureEventData,
  isDoubleSnap,
  isFlick,
  isShake,
  isSnapSpike,
  isWalking,
  isWatchGesture,
  shakePeakCount,
} from "./gestures";

describe("watch gesture classifier", () => {
  it("treats two snaps in the double-snap window as a pair", () => {
    expect(isDoubleSnap(0.3)).toBe(false);
    expect(isDoubleSnap(0.45)).toBe(true);
    expect(isDoubleSnap(0.7)).toBe(true);
    expect(isDoubleSnap(0.9)).toBe(true);
    expect(isDoubleSnap(1.1)).toBe(false);
  });

  it("rejects a walk burst as a shake", () => {
    const walk = Array.from({ length: 12 }, () => 0.3);
    expect(isWalking(walk)).toBe(true);
    expect(isShake({ mags: walk, walking: true })).toBe(false);
  });

  it("counts acceleration peaks as a shake", () => {
    const mags = [0.1, 0.5, 0.1, 0.5, 0.1, 0.5, 0.1];
    expect(shakePeakCount(mags, GESTURE_THRESHOLDS.shakePeakMag)).toBe(3);
    expect(isShake({ mags, walking: false })).toBe(true);
  });

  it("does not treat one snap spike as a flick", () => {
    expect(isFlick({ rotationRate: 0.4, accelMag: 0.4 })).toBe(false);
    expect(isFlick({ rotationRate: 5, accelMag: 0.4 })).toBe(true);
    expect(isFlick({ rotationRate: 5, accelMag: 2 })).toBe(false);
  });

  it("keeps the original single-snap spike rule", () => {
    expect(
      isSnapSpike({ mag: 0.4, rise: 0.2, secondsSinceFire: 0.6, walking: false }),
    ).toBe(true);
    expect(
      isSnapSpike({ mag: 0.4, rise: 0.2, secondsSinceFire: 0.2, walking: false }),
    ).toBe(false);
  });

  it("builds the HA event payload", () => {
    expect(isWatchGesture("double_snap")).toBe(true);
    expect(isWatchGesture("clap")).toBe(false);
    expect(
      buildWatchGestureEventData({
        gesture: "shake",
        atHome: true,
        areaId: "kitchen",
        deviceId: "phone-1",
      }),
    ).toEqual({
      gesture: "shake",
      source: "watch",
      at_home: true,
      area_id: "kitchen",
      device_id: "phone-1",
    });
  });
});
