import { useCallback, useEffect, useRef, useState } from "react";

import { clamp } from "./color-utils";
import { cx } from "./cx";
import { useLiveValue, useThrottledEmit } from "./use-live-value";

export type SliderSize = "sm" | "md" | "lg";

const SIZES: Record<SliderSize, { hit: number; track: number; thumb: number }> =
  {
    sm: { hit: 32, track: 8, thumb: 16 },
    md: { hit: 44, track: 13, thumb: 21 },
    lg: { hit: 52, track: 20, thumb: 26 },
  };

export interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  /** Fires on every pointer move and key press. */
  onValueChange?: (value: number) => void;
  /** Fires once the drag or key press ends. */
  onValueCommit?: (value: number) => void;
  disabled?: boolean;
  label: string;
  size?: SliderSize;
  /** Filled portion of the track. Pass null for gradient tracks. */
  fill?: string | null;
  trackBackground?: string;
  /** When set the thumb is filled with this color instead of ringed by it. */
  thumbColor?: string;
  className?: string;
}

/**
 * A native range input, made invisible and stretched over a drawn track. The
 * browser keeps pointer mapping, keyboard support and ARIA; we own the looks.
 */
export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  onValueCommit,
  disabled = false,
  label,
  size = "md",
  fill = "var(--color-primary)",
  trackBackground,
  thumbColor,
  className,
}: SliderProps) {
  const { hit, track, thumb } = SIZES[size];
  const [dragging, setDragging] = useState(false);

  const span = max - min || 1;
  const ratio = clamp((value - min) / span, 0, 1);
  // Matches how the browser insets a range thumb, so the drawn thumb sits
  // exactly under the pointer.
  const center = `calc(${ratio * 100}% + ${(0.5 - ratio) * thumb}px)`;

  useEffect(() => {
    if (!dragging) return;
    const stop = () => setDragging(false);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [dragging]);

  return (
    <div
      className={cx(
        "relative isolate flex w-full items-center rounded-full",
        "focus-within:outline-none [&:has(:focus-visible)]:ring-2 [&:has(:focus-visible)]:ring-ring [&:has(:focus-visible)]:ring-offset-2 [&:has(:focus-visible)]:ring-offset-transparent",
        disabled && "opacity-50",
        className,
      )}
      style={{ height: hit }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden rounded-full"
        style={{
          height: track,
          background: trackBackground ?? "var(--color-muted)",
          boxShadow: "inset 0 1px 2px rgb(0 0 0 / 0.12)",
        }}
      >
        {fill ? (
          <div
            className={cx(
              "h-full rounded-full",
              !dragging && "motion-safe:transition-[width] motion-safe:duration-200",
            )}
            style={{ width: center, background: fill }}
          />
        ) : null}
      </div>

      <div
        aria-hidden
        className={cx(
          "pointer-events-none absolute top-1/2 rounded-full",
          "motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]",
          dragging
            ? "motion-safe:transition-[transform]"
            : "motion-safe:transition-[left,transform]",
        )}
        style={{
          left: center,
          height: thumb,
          width: thumb,
          transform: `translate(-50%, -50%) scale(${dragging ? 1.12 : 1})`,
          background: thumbColor ?? "var(--color-card)",
          boxShadow: thumbColor
            ? "0 0 0 2px var(--color-card), 0 0 0 3px rgb(0 0 0 / 0.1), 0 1px 4px rgb(0 0 0 / 0.3)"
            : `0 0 0 2px ${fill ?? "var(--color-border)"}, 0 0 0 3px rgb(0 0 0 / 0.1), 0 1px 4px rgb(0 0 0 / 0.25)`,
        }}
      />

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onPointerDown={(event) => {
          event.stopPropagation();
          setDragging(true);
        }}
        onChange={(event) => onValueChange?.(Number(event.target.value))}
        onPointerUp={(event) =>
          onValueCommit?.(Number(event.currentTarget.value))
        }
        onKeyUp={(event) => onValueCommit?.(Number(event.currentTarget.value))}
        className={cx(
          "relative z-10 m-0 h-full w-full cursor-pointer touch-none appearance-none bg-transparent opacity-0 disabled:cursor-default",
          "[&::-webkit-slider-thumb]:h-[var(--thumb-size)] [&::-webkit-slider-thumb]:w-[var(--thumb-size)] [&::-webkit-slider-thumb]:appearance-none",
          "[&::-moz-range-thumb]:h-[var(--thumb-size)] [&::-moz-range-thumb]:w-[var(--thumb-size)] [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border-0",
        )}
        style={{ ["--thumb-size" as string]: `${thumb}px` }}
      />
    </div>
  );
}

export interface ServiceValueBinding {
  value: number;
  onValueChange: (next: number) => void;
  onValueCommit: (next: number) => void;
}

/**
 * Binds a slider to a Home Assistant service call: the thumb follows the finger
 * immediately, calls are throttled during the drag, and the final value always
 * lands.
 */
export function useServiceValue(
  value: number,
  commit: (next: number) => void | Promise<void>,
  options: { throttleMs?: number; holdMs?: number } = {},
): ServiceValueBinding {
  const [local, setLocal] = useLiveValue(value, options.holdMs);
  const commitRef = useRef(commit);
  commitRef.current = commit;

  const { send, flush } = useThrottledEmit(
    (next) => void commitRef.current(next),
    options.throttleMs ?? 110,
  );

  const onValueChange = useCallback(
    (next: number) => {
      setLocal(next);
      send(next);
    },
    [send, setLocal],
  );

  const onValueCommit = useCallback(
    (next: number) => {
      setLocal(next);
      flush(next);
    },
    [flush, setLocal],
  );

  return { value: local, onValueChange, onValueCommit };
}
