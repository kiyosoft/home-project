import type { TileSize } from "@ethio/mobile-schema";
import { createContext, useContext, type ReactNode } from "react";

/**
 * Height as a share of the column, not a constant. A tile that is 132pt tall
 * next to a 168pt column reads as a wide box; holding the proportion instead
 * keeps the grid near-square on a small phone and on a tablet alike.
 */
const RATIO: Record<TileSize, number> = {
  sm: 0.94,
  md: 1.06,
};

/** Stops a narrow phone from crushing a tile or a tablet from stretching one. */
const MIN_HEIGHT = 132;
const MAX_HEIGHT = 200;

/** What a tile falls back to on the frame before the grid has measured itself. */
const FALLBACK: Record<TileSize, number> = {
  sm: 132,
  md: 148,
};

const TileColumnContext = createContext(0);

/** Publishes the grid's column width so tiles can size themselves from it. */
export function TileColumnProvider({
  column,
  children,
}: {
  column: number;
  children: ReactNode;
}) {
  return (
    <TileColumnContext.Provider value={column}>
      {children}
    </TileColumnContext.Provider>
  );
}

export function useTileMinHeight(size: TileSize): number {
  const column = useContext(TileColumnContext);
  if (column <= 0) return FALLBACK[size];
  const height = column * RATIO[size];
  return Math.round(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, height)));
}
