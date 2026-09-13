import { describe, expect, it, vi } from "vitest";

import {
  dispatchHassKioskMode,
  isEmbeddedHassWindow,
} from "./hass-parent-kiosk";

describe("isEmbeddedHassWindow", () => {
  it("rejects the top window", () => {
    const top = {} as Window;
    expect(isEmbeddedHassWindow(top, top)).toBe(false);
  });

  it("accepts a same-origin parent", () => {
    const current = {} as Window;
    const parent = { location: { href: "https://homeassistant.local:8123/" } } as Window;
    expect(isEmbeddedHassWindow(current, parent)).toBe(true);
  });

  it("rejects a cross-origin parent", () => {
    const current = {} as Window;
    const parent = {
      get location(): Location {
        throw new DOMException("Blocked", "SecurityError");
      },
    } as Window;
    expect(isEmbeddedHassWindow(current, parent)).toBe(false);
  });
});

describe("dispatchHassKioskMode", () => {
  it("fires Home Assistant's kiosk event", () => {
    const target = new EventTarget();
    const onKiosk = vi.fn();
    target.addEventListener("hass-kiosk-mode", onKiosk);

    dispatchHassKioskMode(target, true);

    expect(onKiosk).toHaveBeenCalledOnce();
    const event = onKiosk.mock.calls[0][0] as CustomEvent<{ enable: boolean }>;
    expect(event.detail).toEqual({ enable: true });
  });
});
