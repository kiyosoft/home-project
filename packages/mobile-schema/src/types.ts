/** Plugin widget id, shared with the web dashboard (e.g. "@ethio/core/light"). */
export type WidgetType = string;

/** Phone tiles flow instead of sitting on a grid: half width, full width, or full width and tall. */
export type TileSize = "sm" | "md" | "lg";

export interface MobileWidget {
  id: string;
  type: WidgetType;
  config: Record<string, unknown>;
  /** Falls back to the widget definition's default size. */
  size?: TileSize;
}

export interface ExplicitSource {
  kind: "explicit";
  widgets: MobileWidget[];
}

export interface AreaSource {
  kind: "area";
  areaId: string;
  exclude?: string[];
}

export interface DomainSource {
  kind: "domain";
  domains: string[];
  areaId?: string;
  exclude?: string[];
}

export type SectionSource = ExplicitSource | AreaSource | DomainSource;

export interface MobileSection {
  id: string;
  /** Omitted for query sections: the area name or domain label is used instead. */
  title?: string;
  source: SectionSource;
  collapsed?: boolean;
}

export interface MobileDashboard {
  version: 1;
  id: string;
  title: string;
  /** Entity ids pinned above every section. */
  favorites?: string[];
  sections: MobileSection[];
}

export const TILE_SIZES: TileSize[] = ["sm", "md", "lg"];

export function tileSpan(size: TileSize): 1 | 2 {
  return size === "sm" ? 1 : 2;
}
