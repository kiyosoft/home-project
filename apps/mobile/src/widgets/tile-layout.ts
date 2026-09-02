import type { TileSize } from "@ethio/mobile-schema";

/**
 * Height as a share of the column, not a constant. A tile that is 132pt tall
 * next to a 168pt column reads as a wide box; holding the proportion instead
 * keeps the grid near-square on a small phone and on a tablet alike.
 */
const RATIO: Record<TileSize, number> = {
  sm: 0.94,
  md: 1.06,
  lg: 1.55,
};

/** Stops a narrow phone from crushing a tile or a tablet from stretching one. */
const MIN_HEIGHT = 132;
const MAX_HEIGHT: Record<TileSize, number> = {
  sm: 200,
  md: 220,
  lg: 320,
};

/** What a tile falls back to on the frame before the grid has measured itself. */
const FALLBACK: Record<TileSize, number> = {
  sm: 132,
  md: 148,
  lg: 220,
};

export const TILE_GAP = 16;

export function columnsForWidth(width: number): 2 | 4 {
  return width >= 700 ? 4 : 2;
}

/** Width of one column inside a row of the given width. */
export function tileColumn(width: number, columns: number): number {
  return (width - TILE_GAP * (columns - 1)) / columns;
}

export function tileMinHeight(column: number, size: TileSize): number {
  if (column <= 0) return FALLBACK[size];
  const height = column * RATIO[size];
  return Math.round(Math.min(MAX_HEIGHT[size], Math.max(MIN_HEIGHT, height)));
}
