import { Easing, type WithSpringConfig, type WithTimingConfig } from "react-native-reanimated";

/**
 * The app's two motion voices. Controls answer with SPRING so a toggle feels
 * mechanical; ambient colour moves with WASH so a room lighting up reads as
 * light arriving rather than a value changing.
 *
 * Everything animated on the Home screen picks one of these. A one-off duration
 * is what makes a surface feel like it belongs to a different app.
 */

/** Toggles, press states, anything the finger just caused. */
export const SPRING: WithSpringConfig = {
  duration: 380,
  dampingRatio: 0.72,
};

/** Badges and controls entering or leaving; overshoots a little more. */
export const SPRING_POP: WithSpringConfig = {
  duration: 420,
  dampingRatio: 0.6,
};

/** Tile tint and the ambient background. Slow enough to read as light. */
export const WASH: WithTimingConfig = {
  duration: 420,
  easing: Easing.out(Easing.cubic),
};

/** Layout settling, e.g. a tile changing width when it is resized. */
export const SETTLE_MS = 260;

/** Icon and label cross-fades, where anything slower reads as lag. */
export const FADE_MS = 180;

export const FADE: WithTimingConfig = {
  duration: FADE_MS,
  easing: Easing.out(Easing.quad),
};

/**
 * Press scale for tiles. PressableFeedback defaults to 0.985 scaled down
 * further by container width, which is invisible on a half tile.
 */
export const PRESS_SCALE = {
  scale: { value: 0.96, ignoreScaleCoefficient: true },
} as const;
