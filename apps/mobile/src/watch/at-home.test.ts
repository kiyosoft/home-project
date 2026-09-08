import { describe, expect, it } from "vitest";

import { distanceMeters, isInsideRegion } from "./geo";

describe("at-home geofence", () => {
  it("treats a point next to the hub as inside", () => {
    expect(
      isInsideRegion(9.03, 38.74, {
        latitude: 9.03,
        longitude: 38.74,
        radius: 100,
      }),
    ).toBe(true);
  });

  it("treats a kilometre away as outside", () => {
    expect(
      isInsideRegion(9.04, 38.74, {
        latitude: 9.03,
        longitude: 38.74,
        radius: 100,
      }),
    ).toBe(false);
    expect(distanceMeters(9.03, 38.74, 9.04, 38.74)).toBeGreaterThan(900);
  });
});
