import type { Breakpoint, GridItem, PageLayouts } from "./types";
import { COLS } from "./types";

export interface SizeHint {
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export function emptyLayouts(): PageLayouts {
  return { lg: [], md: [], sm: [] };
}

/** Pack widgets left-to-right, wrapping by column count. */
export function packLayouts(
  widgetIds: string[],
  size: SizeHint,
): PageLayouts {
  return packLayoutsSized(widgetIds.map((id) => ({ id, size })));
}

/** Pack widgets with per-item size hints. */
export function packLayoutsSized(
  items: { id: string; size: SizeHint }[],
): PageLayouts {
  const pack = (cols: number): GridItem[] => {
    let x = 0;
    let y = 0;
    let rowH = 0;

    return items.map(({ id, size }) => {
      const w = Math.min(size.w, cols);
      if (x + w > cols) {
        x = 0;
        y += rowH;
        rowH = 0;
      }
      const item: GridItem = {
        i: id,
        x,
        y,
        w,
        h: size.h,
        minW: size.minW,
        minH: size.minH,
        maxW: size.maxW,
        maxH: size.maxH,
      };
      x += w;
      rowH = Math.max(rowH, size.h);
      return item;
    });
  };

  return {
    lg: pack(COLS.lg),
    md: pack(COLS.md),
    sm: pack(COLS.sm),
  };
}

export function findFirstFreeSlot(
  layout: GridItem[],
  size: SizeHint,
  cols: number,
): { x: number; y: number } {
  const w = Math.min(size.w, cols);
  const h = size.h;
  const occupied = new Set(
    layout.flatMap((item) => {
      const cells: string[] = [];
      for (let yy = item.y; yy < item.y + item.h; yy++) {
        for (let xx = item.x; xx < item.x + item.w; xx++) {
          cells.push(`${xx},${yy}`);
        }
      }
      return cells;
    }),
  );

  for (let y = 0; y < 200; y++) {
    for (let x = 0; x <= cols - w; x++) {
      let fits = true;
      for (let yy = y; yy < y + h && fits; yy++) {
        for (let xx = x; xx < x + w; xx++) {
          if (occupied.has(`${xx},${yy}`)) {
            fits = false;
            break;
          }
        }
      }
      if (fits) return { x, y };
    }
  }

  return { x: 0, y: 0 };
}

export function createLayoutItem(
  id: string,
  layout: GridItem[],
  size: SizeHint,
  breakpoint: Breakpoint,
): GridItem {
  const cols = COLS[breakpoint];
  const { x, y } = findFirstFreeSlot(layout, size, cols);
  return {
    i: id,
    x,
    y,
    w: Math.min(size.w, cols),
    h: size.h,
    minW: size.minW,
    minH: size.minH,
    maxW: size.maxW,
    maxH: size.maxH,
  };
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
