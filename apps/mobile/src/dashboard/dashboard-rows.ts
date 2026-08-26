import { tileSpan, type MobileWidget } from "@ethio/mobile-schema";

import type { ResolvedSection } from "@/dashboard/resolve-sections";

const COLUMNS = 2;

/**
 * What sits above a row: the gap between sections, a section title, or the
 * previous row of the same section. The screen owns the pixels.
 */
export type RowSpacing = "section" | "title" | "row";

export interface DashboardHeaderRow {
  kind: "header";
  id: string;
  title: string;
}

export interface DashboardTilesRow {
  kind: "tiles";
  id: string;
  sectionId: string;
  /** One full-width tile, or up to two half-width ones. Empty on an add-only row. */
  widgets: MobileWidget[];
  /** Edit mode's add tile, filling this row's free slot or standing alone. */
  withAdd: boolean;
  spacing: RowSpacing;
}

export type DashboardRow = DashboardHeaderRow | DashboardTilesRow;

export interface BuildRowsOptions {
  sections: ResolvedSection[];
  editing: boolean;
}

/**
 * Flattens sections into one row per line of the grid. A list can only
 * virtualize items it can measure, and a wrapping container of mixed-span tiles
 * gives it nothing to measure, so the wrapping happens here instead.
 */
export function buildDashboardRows({
  sections,
  editing,
}: BuildRowsOptions): DashboardRow[] {
  const rows: DashboardRow[] = [];

  for (const section of sections) {
    const start = rows.length;

    if (section.title) {
      rows.push({
        kind: "header",
        id: `${section.id}:header`,
        title: section.title,
      });
    }

    // The row a half-width tile can still join.
    let open: DashboardTilesRow | null = null;

    for (const widget of section.widgets) {
      const span = tileSpan(widget.size ?? "sm");

      if (open && span < COLUMNS) {
        open.widgets.push(widget);
        open = null;
        continue;
      }

      const row: DashboardTilesRow = {
        kind: "tiles",
        id: `${section.id}:row:${widget.id}`,
        sectionId: section.id,
        widgets: [widget],
        withAdd: false,
        spacing: "row",
      };
      rows.push(row);
      open = span < COLUMNS ? row : null;
    }

    if (editing) {
      if (open) {
        open.withAdd = true;
      } else {
        rows.push({
          kind: "tiles",
          id: `${section.id}:add`,
          sectionId: section.id,
          widgets: [],
          withAdd: true,
          spacing: "row",
        });
      }
    }

    const first = rows[section.title ? start + 1 : start];
    if (first?.kind === "tiles") {
      first.spacing = section.title ? "title" : "section";
    }
  }

  return rows;
}
