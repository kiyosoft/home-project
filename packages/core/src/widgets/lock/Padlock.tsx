import { useEffect, useState } from "react";

/** Shackle clears the body, then swings off the left post. */
const UNLOCK_MS = 420;
/** Reverse of the unlock, faster the way an exit should be. */
const LOCK_MS = 320;
const SEAT_MS = 130;

/**
 * The drawing is laid out so both poses fill the view box, which lets the card
 * scale the padlock to its whole box instead of padding around it.
 */
const VIEW_BOX = "0 0 30 46";
/** Bottom of the left post, which the shackle swings around. */
const PIVOT = "7px 26px";
const BODY_CENTER = "15px 35px";
const OPEN_POSE = "translateY(-4px) rotate(-30deg)";
const SEATED_POSE = "translateY(0) rotate(0deg)";
/** Halfway: clear of the body, not yet swung. */
const LIFTED_POSE = "translateY(-4px) rotate(0deg)";

const STYLE_ID = "ethio-padlock-motion";

const MOTION_CSS = `
.ethio-padlock-shackle {
  transform-box: view-box;
  transform-origin: ${PIVOT};
}
.ethio-padlock-body {
  transform-box: view-box;
  transform-origin: ${BODY_CENTER};
}
.ethio-padlock-shake {
  transform-box: view-box;
}
@keyframes ethio-padlock-unlock {
  0% {
    transform: ${SEATED_POSE};
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }
  40% {
    transform: ${LIFTED_POSE};
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }
  100% {
    transform: ${OPEN_POSE};
  }
}
@keyframes ethio-padlock-lock {
  0% {
    transform: ${OPEN_POSE};
    animation-timing-function: cubic-bezier(0.65, 0, 0.35, 1);
  }
  55% {
    transform: ${LIFTED_POSE};
    animation-timing-function: cubic-bezier(0.7, 0, 0.84, 0);
  }
  100% {
    transform: ${SEATED_POSE};
  }
}
@keyframes ethio-padlock-seat {
  0% { transform: scale(1); }
  45% { transform: scale(0.97); }
  100% { transform: scale(1); }
}
@keyframes ethio-padlock-jam {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-1.2px); }
  40% { transform: translateX(1.2px); }
  60% { transform: translateX(-0.8px); }
  80% { transform: translateX(0.4px); }
}
@media (prefers-reduced-motion: reduce) {
  .ethio-padlock-shackle,
  .ethio-padlock-body,
  .ethio-padlock-shake {
    animation: none !important;
  }
}
`;

/**
 * One sheet for every padlock on the dashboard. The rules are static, so
 * instances share them rather than each carrying its own <style>.
 */
function useMotionStyles() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = MOTION_CSS;
    document.head.appendChild(style);
  }, []);
}

export interface PadlockProps {
  /** Shackle raised and swung clear of the body. */
  open: boolean;
  /** The lock reported a jam, so the shackle never seated. */
  jammed?: boolean;
  /** Sizing is left to the caller's box; the drawing scales to fit it. */
  className?: string;
}

/**
 * A padlock that animates between locked and unlocked. The first render lands
 * on its pose without moving, so a dashboard load never plays an unlock.
 */
export function Padlock({ open, jammed = false, className }: PadlockProps) {
  useMotionStyles();

  const pose = `${open}:${jammed}`;
  const [seen, setSeen] = useState(pose);
  const [animate, setAnimate] = useState(false);
  if (seen !== pose) {
    setSeen(pose);
    setAnimate(true);
  }

  const shackleAnimation = animate
    ? open
      ? `ethio-padlock-unlock ${UNLOCK_MS}ms linear both`
      : `ethio-padlock-lock ${LOCK_MS}ms linear both`
    : undefined;

  return (
    <svg
      viewBox={VIEW_BOX}
      aria-hidden
      focusable="false"
      className={className}
    >
      <g
        className="ethio-padlock-shake"
        style={{
          animation:
            animate && jammed
              ? "ethio-padlock-jam 320ms ease-out both"
              : undefined,
        }}
      >
        <path
          className="ethio-padlock-shackle"
          d="M7 26v-10a8 8 0 0 1 16 0v10"
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          strokeLinecap="round"
          style={{
            transform: open ? OPEN_POSE : undefined,
            animation: shackleAnimation,
          }}
        />
        <g
          className="ethio-padlock-body"
          style={{
            // Lands as the shackle drops, so the bolt reads as seating.
            animation:
              animate && !open
                ? `ethio-padlock-seat ${SEAT_MS}ms cubic-bezier(0.16, 1, 0.3, 1) ${
                    LOCK_MS - SEAT_MS * 0.6
                  }ms both`
                : undefined,
          }}
        >
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M5 24h20a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5V29a5 5 0 0 1 5-5Zm10 5.8a3 3 0 0 1 1.8 5.4l.9 4.9h-5.4l.9-4.9A3 3 0 0 1 15 29.8Z"
          />
        </g>
      </g>
    </svg>
  );
}
