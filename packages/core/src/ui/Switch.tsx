import type { MouseEvent } from "react";

import { cx } from "./cx";

export type SwitchSize = "sm" | "md";

const SIZES: Record<
  SwitchSize,
  { width: number; height: number; thumb: number; inset: number }
> = {
  sm: { width: 38, height: 24, thumb: 18, inset: 3 },
  md: { width: 44, height: 28, thumb: 22, inset: 3 },
};

export interface SwitchProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  size?: SwitchSize;
  /** Track color when on. Lights pass their own color here. */
  activeColor?: string;
  activeThumbColor?: string;
  /**
   * Render as a non-interactive span. Use inside an element that already
   * handles the click, since a button cannot be nested in a button.
   */
  presentational?: boolean;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  size = "md",
  activeColor,
  activeThumbColor,
  presentational = false,
  className,
}: SwitchProps) {
  const { width, height, thumb, inset } = SIZES[size];
  const travel = width - thumb - inset * 2;

  const trackClass = cx(
    "relative inline-flex shrink-0 items-center rounded-full",
    "motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]",
    !presentational &&
      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-default disabled:opacity-50",
    className,
  );

  const trackStyle = {
    width,
    height,
    background: checked
      ? activeColor ?? "var(--color-primary)"
      : "var(--color-muted)",
    boxShadow: checked
      ? "inset 0 1px 2px rgb(0 0 0 / 0.18)"
      : "inset 0 1px 3px rgb(0 0 0 / 0.16)",
  };

  const knob = (
    <span
      aria-hidden
      className="absolute rounded-full motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{
        height: thumb,
        width: thumb,
        left: inset,
        transform: `translateX(${checked ? travel : 0}px)`,
        background: checked
          ? activeThumbColor ?? "var(--color-primary-foreground)"
          : "var(--color-card)",
        boxShadow: "0 1px 3px rgb(0 0 0 / 0.28)",
      }}
    />
  );

  if (presentational) {
    return (
      <span aria-hidden className={trackClass} style={trackStyle}>
        {knob}
      </span>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onCheckedChange?.(!checked);
      }}
      className={trackClass}
      style={trackStyle}
    >
      {knob}
    </button>
  );
}
