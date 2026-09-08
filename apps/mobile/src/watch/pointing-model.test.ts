import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  applyCorrection,
  circularDistanceDeg,
  circularMeanDeg,
  inferTarget,
  markContested,
  paintDevice,
  pdrStep,
  type DeviceModel,
  type InferResult,
  type Pose,
  type Sample,
} from "./pointing-model";

const fixtures = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "pointing-model.fixtures.json"),
    "utf8",
  ),
) as {
  headingOnly: Case;
  contestedPair: Case;
  wrongRoom: Omit<Case, "devices"> & { devices?: DeviceModel[] };
  tooFar: Omit<Case, "devices"> & { devices?: DeviceModel[] };
  paintStill: { samples: Sample[]; expectMean: number; expectPoint: boolean };
  paintWalk: { samples: Sample[]; expectPoint: boolean };
  pdrEast: { from: Pose; walkHeadingDeg: number; expect: { x: number; y: number } };
};

interface Case {
  devices: DeviceModel[];
  pose: Pose;
  areaId: string;
  expect: Partial<InferResult>;
}

function expectInfer(entry: Case) {
  const result = inferTarget(entry.pose, entry.devices, entry.areaId);
  if (entry.expect.entityId !== undefined) {
    expect(result.entityId).toBe(entry.expect.entityId);
  }
  if (entry.expect.runnerUpId !== undefined) {
    expect(result.runnerUpId).toBe(entry.expect.runnerUpId);
  }
  if (entry.expect.contested !== undefined) {
    expect(result.contested).toBe(entry.expect.contested);
  }
}

describe("pointing model", () => {
  it("picks the lamp whose heading is closer", () => {
    expectInfer(fixtures.headingOnly);
  });

  it("flags two lamps that sit almost on the same bearing", () => {
    expectInfer(fixtures.contestedPair);
  });

  it("does not guess a device from another room", () => {
    expectInfer({
      ...fixtures.wrongRoom,
      devices: fixtures.headingOnly.devices,
    });
  });

  it("refuses a heading that is nowhere near a painted lamp", () => {
    expectInfer({
      ...fixtures.tooFar,
      devices: fixtures.headingOnly.devices,
    });
  });

  it("paints a still wearer as a heading cluster, not a 2D point", () => {
    const model = paintDevice("light.kitchen", "kitchen", fixtures.paintStill.samples);
    expect(
      circularDistanceDeg(model.headingMean, fixtures.paintStill.expectMean),
    ).toBeLessThan(2);
    expect(model.x).toBeUndefined();
    expect(model.sampleCount).toBe(3);
  });

  it("fits a point when the wearer walks while pointing", () => {
    const model = paintDevice("light.east", "kitchen", fixtures.paintWalk.samples);
    expect(model.x).toBeDefined();
    expect(model.y).toBeDefined();
  });

  it("steps pedestrian dead-reckoning east", () => {
    const next = pdrStep(fixtures.pdrEast.from, fixtures.pdrEast.walkHeadingDeg);
    expect(next.x).toBeCloseTo(fixtures.pdrEast.expect.x, 5);
    expect(next.y).toBeCloseTo(fixtures.pdrEast.expect.y, 5);
  });

  it("pushes a rejected heading away from the chosen lamp", () => {
    const corrected = applyCorrection(
      fixtures.contestedPair.devices,
      "light.right",
      "light.left",
    );
    const left = corrected.find((device) => device.entityId === "light.left");
    const right = corrected.find((device) => device.entityId === "light.right");
    expect(left?.contested).toBe(true);
    expect(right?.contested).toBe(false);
    expect(circularDistanceDeg(left?.headingMean ?? 0, 0)).toBeGreaterThan(10);
  });

  it("marks a pair as contested when their means sit on top of each other", () => {
    const flagged = markContested([
      {
        entityId: "light.a",
        areaId: "den",
        headingMean: 12,
        headingKappa: 8,
        pitchMean: 0,
        sampleCount: 10,
        contested: false,
      },
      {
        entityId: "light.b",
        areaId: "den",
        headingMean: 14,
        headingKappa: 8,
        pitchMean: 0,
        sampleCount: 10,
        contested: false,
      },
    ]);
    expect(flagged.every((device) => device.contested)).toBe(true);
  });

  it("averages headings across the 0° wrap", () => {
    expect(circularMeanDeg([350, 10])).toBeCloseTo(0, 0);
  });
});
