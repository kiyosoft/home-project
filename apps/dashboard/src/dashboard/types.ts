export type {
  Breakpoint,
  DashboardConfig,
  DashboardHeaderConfig,
  DashboardPage,
  DashboardWidget,
  GridItem,
  HeaderPillConfig,
  PageLayouts,
  TimeFormat,
  WidgetType,
} from "@ethio/dashboard-schema";

export {
  BREAKPOINT_ORDER,
  BREAKPOINTS,
  breakpointFromWidth,
  COLS,
} from "@ethio/dashboard-schema";

export type EditorMode = "live" | "edit";

/** Outer frame and card gutters — keep these equal so the grid aligns with the header. */
export const DASH_GAP = 20;
