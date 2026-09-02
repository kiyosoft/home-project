/** Plugin widget id, shared with the web dashboard (e.g. "@ethio/core/light"). */
export type WidgetType = string;

/** Phone tiles flow instead of sitting on a grid: half width, full width, or tall. */
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

export interface SceneSource {
  kind: "scene";
  entities: string[];
}

export type SectionSource =
  | ExplicitSource
  | AreaSource
  | DomainSource
  | SceneSource;

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
  /**
   * Per-widget width, keyed by widget id. It lives here rather than on the
   * widget so a tile from a query section or from favourites — neither of
   * which has a stored widget to edit — can still be resized.
   */
  sizes?: Record<string, TileSize>;
  sections: MobileSection[];
}

export const SCENE_DOMAINS: readonly string[] = ["scene", "script"];

export function isSceneEntityId(entityId: string): boolean {
  return SCENE_DOMAINS.includes(entityId.split(".")[0] ?? "");
}

export function serviceForSceneEntity(
  entityId: string,
): { domain: string; service: string } | null {
  const domain = entityId.split(".")[0] ?? "";
  if (!SCENE_DOMAINS.includes(domain)) return null;
  return { domain, service: "turn_on" };
}

export const TILE_SIZES: TileSize[] = ["sm", "md", "lg"];

export function tileSpan(size: TileSize): 1 | 2 {
  return size === "sm" ? 1 : 2;
}

export function otherTileSize(size: TileSize): TileSize {
  if (size === "sm") return "md";
  if (size === "md") return "lg";
  return "sm";
}
