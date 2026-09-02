import type { TileSize } from "@ethio/mobile-schema";
import { createContext, useContext, type ReactNode } from "react";

import { tileMinHeight } from "@/widgets/tile-layout";

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
  return tileMinHeight(useContext(TileColumnContext), size);
}
