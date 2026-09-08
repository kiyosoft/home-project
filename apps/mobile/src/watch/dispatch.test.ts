import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/home-screen/dispatch", () => ({
  dispatchWidgetTarget: vi.fn(),
}));

vi.mock("@/store/ha-store", () => ({
  useHaStore: { getState: () => ({ callService: vi.fn(), entities: {} }) },
}));

import { dispatchWidgetTarget } from "@/home-screen/dispatch";

import { dispatchWatchToggle } from "./dispatch";

describe("dispatchWatchToggle", () => {
  beforeEach(() => {
    vi.mocked(dispatchWidgetTarget).mockClear();
  });

  it("toggles a light through the widget path", () => {
    dispatchWatchToggle("light.kitchen");
    expect(dispatchWidgetTarget).toHaveBeenCalledWith("toggle:light.kitchen");
  });

  it("turns a scene on", () => {
    dispatchWatchToggle("scene.movie_night");
    expect(dispatchWidgetTarget).toHaveBeenCalledWith("scene:scene.movie_night");
  });

  it("ignores a camera", () => {
    dispatchWatchToggle("camera.front");
    expect(dispatchWidgetTarget).not.toHaveBeenCalled();
  });
});
