import { tileSpan, type MobileWidget } from "@ethio/mobile-schema";

import type { ResolvedSection } from "@/dashboard/resolve-sections";

/**
 * What sits above a row: the gap between sections, a section title, or the
 * previous row of the same section. The screen owns the pixels.
 */
export type RowSpacing = "section" | "title" | "row";

export interface DashboardHeaderRow {
  kind: "header";
  id: string;
  title: string;
  /** Everything under this heading, so it can count what is currently on. */
  entityIds: string[];
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

export interface DashboardScenesRow {
  kind: "scenes";
  id: string;
  sectionId: string;
  entityIds: string[];
  /** Edit mode's add pill, filling this row or standing alone. */
  withAdd: boolean;
  spacing: RowSpacing;
}

export type DashboardRow =
  | DashboardHeaderRow
  | DashboardTilesRow
  | DashboardScenesRow;

export interface BuildRowsOptions {
  sections: ResolvedSection[];
  editing: boolean;
  columns: number;
}

/**
 * Flattens sections into one row per line of the grid. A list can only
 * virtualize items it can measure, and a wrapping container of mixed-span tiles
 * gives it nothing to measure, so the wrapping happens here instead.
 */
export function buildDashboardRows({
  sections,
  editing,
  columns,
}: BuildRowsOptions): DashboardRow[] {
  const rows: DashboardRow[] = [];

  for (const section of sections) {
    const start = rows.length;

    if (section.title) {
      const entityIds: string[] = [];
      for (const widget of section.widgets) {
        const entityId = widget.config.entity_id;
        if (typeof entityId === "string") entityIds.push(entityId);
      }
      rows.push({
        kind: "header",
        id: `${section.id}:header`,
        title: section.title,
        entityIds,
      });
    }

    if (section.scenes !== undefined) {
      // One pill row for the whole section, including an empty edit-mode add.
      rows.push({
        kind: "scenes",
        id: `${section.id}:scenes`,
        sectionId: section.id,
        entityIds: section.scenes,
        withAdd: editing,
        spacing: "row",
      });
    } else {
      // The row a half-width tile can still join.
      let open: DashboardTilesRow | null = null;
      let used = 0;

      for (const widget of section.widgets) {
        const span = tileSpan(widget.size ?? "sm");

        if (open && used + span <= columns) {
          open.widgets.push(widget);
          used += span;
          if (used >= columns) {
            open = null;
            used = 0;
          }
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
        if (span < columns) {
          open = row;
          used = span;
        } else {
          open = null;
          used = 0;
        }
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
    }

    const first = rows[section.title ? start + 1 : start];
    if (first && first.kind !== "header") {
      first.spacing = section.title ? "title" : "section";
    }
  }

  return rows;
}
