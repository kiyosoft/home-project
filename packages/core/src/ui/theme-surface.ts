import { useEffect, useState } from "react";

import type { Rgb } from "./color-utils";

export interface ThemeSurface {
  card: Rgb;
  foreground: Rgb;
}

const FALLBACK: ThemeSurface = { card: [255, 253, 248], foreground: [28, 25, 22] };

function parseRgb(value: string): Rgb | null {
  const parts = value.match(/-?[\d.]+/g);
  if (!parts || parts.length < 3) return null;
  const rgb = parts.slice(0, 3).map(Number);
  return rgb.every((n) => Number.isFinite(n)) ? (rgb as Rgb) : null;
}

function measure(): ThemeSurface {
  if (typeof document === "undefined" || !document.body) return FALLBACK;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;left:-9999px;top:0;width:1px;height:1px;pointer-events:none;background:var(--color-card);color:var(--color-foreground)";
  document.body.appendChild(probe);
  const styles = getComputedStyle(probe);
  const surface: ThemeSurface = {
    card: parseRgb(styles.backgroundColor) ?? FALLBACK.card,
    foreground: parseRgb(styles.color) ?? FALLBACK.foreground,
  };
  probe.remove();
  return surface;
}

let current: ThemeSurface | null = null;
let observer: MutationObserver | null = null;
const listeners = new Set<(surface: ThemeSurface) => void>();

function read(): ThemeSurface {
  current ??= measure();
  return current;
}

/**
 * Resolved card and text colors for the active theme, so widgets can blend
 * their own tints on top and pick readable ink.
 */
export function useThemeSurface(): ThemeSurface {
  const [surface, setSurface] = useState<ThemeSurface>(read);

  useEffect(() => {
    listeners.add(setSurface);
    setSurface(read());

    if (!observer && typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(() => {
        current = measure();
        for (const listener of listeners) listener(current);
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "data-theme", "style"],
      });
    }

    return () => {
      listeners.delete(setSurface);
    };
  }, []);

  return surface;
}
