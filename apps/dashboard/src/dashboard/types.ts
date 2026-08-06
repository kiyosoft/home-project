export type Breakpoint = "lg" | "md" | "sm";

/** Plugin widget id (namespaced) or Phase 2 short alias */
export type WidgetType = string;

export interface GridItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export type PageLayouts = Record<Breakpoint, GridItem[]>;

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  config: Record<string, unknown>;
}

export interface DashboardPage {
  id: string;
  title: string;
  layouts: PageLayouts;
  widgets: DashboardWidget[];
}

export type TimeFormat = "12h" | "24h";

export interface DashboardHeaderConfig {
  /** Show dashboard title (default true) */
  showTitle?: boolean;
  /** Show live date under the title (default true) */
  showDate?: boolean;
  /** Show live clock on the right (default true) */
  showTime?: boolean;
  /** Clock format (default 24h) */
  timeFormat?: TimeFormat;
}

export interface DashboardConfig {
  id: string;
  title: string;
  pages: DashboardPage[];
  /** When true, reduce chrome in kiosk (page dock still shown for switching) */
  cardsOnly?: boolean;
  /** Tunet-style header: title / date / time */
  header?: DashboardHeaderConfig;
}

export type EditorMode = "live" | "edit";

export const BREAKPOINTS: Record<Breakpoint, number> = {
  lg: 1024,
  md: 768,
  sm: 0,
};

export const COLS: Record<Breakpoint, number> = {
  lg: 12,
  md: 8,
  sm: 4,
};

export const BREAKPOINT_ORDER: Breakpoint[] = ["lg", "md", "sm"];
