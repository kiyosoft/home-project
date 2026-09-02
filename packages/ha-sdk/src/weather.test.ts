import { describe, expect, it } from "vitest";

import {
  compactTemperatureUnit,
  weatherSparklinePath,
  WEATHER_SPARKLINE,
} from "./weather";

describe("compactTemperatureUnit", () => {
  it("collapses C and F to a degree mark", () => {
    expect(compactTemperatureUnit("°C")).toBe("°");
    expect(compactTemperatureUnit("°F")).toBe("°");
    expect(compactTemperatureUnit("K")).toBe("K");
  });
});

describe("weatherSparklinePath", () => {
  it("returns null until there are two points", () => {
    expect(weatherSparklinePath([{ temperature: 20 }])).toBeNull();
  });

  it("builds an SVG path across the sparkline box", () => {
    expect(
      weatherSparklinePath([{ temperature: 10 }, { temperature: 20 }]),
    ).toBe(`M0.0 34.0 L${WEATHER_SPARKLINE.width}.0 2.0`);
  });
});
