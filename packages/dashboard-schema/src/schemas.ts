import { z } from "zod";

export const gridItemSchema = z.object({
  i: z.string().min(1),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  minW: z.number().int().positive().optional(),
  minH: z.number().int().positive().optional(),
  maxW: z.number().int().positive().optional(),
  maxH: z.number().int().positive().optional(),
});

export const pageLayoutsSchema = z.object({
  lg: z.array(gridItemSchema),
  md: z.array(gridItemSchema),
  sm: z.array(gridItemSchema),
});

export const widgetTypeSchema = z.string().min(1);

export const dashboardWidgetSchema = z.object({
  id: z.string().min(1),
  type: widgetTypeSchema,
  config: z.record(z.string(), z.unknown()),
});

export const dashboardPageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  layouts: pageLayoutsSchema,
  widgets: z.array(dashboardWidgetSchema),
});

export const headerPillSchema = z
  .object({
    entity_id: z.string().optional(),
    template: z.string().optional(),
  })
  .refine(
    (pill) => Boolean(pill.entity_id?.trim() || pill.template !== undefined),
    { message: "Pill requires entity_id or template" },
  );

export const dashboardHeaderSchema = z.object({
  showTitle: z.boolean().optional(),
  showDate: z.boolean().optional(),
  showTime: z.boolean().optional(),
  timeFormat: z.enum(["12h", "24h"]).optional(),
  pills: z.array(headerPillSchema).optional(),
});

export const dashboardConfigSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  pages: z.array(dashboardPageSchema).min(1),
  cardsOnly: z.boolean().optional(),
  header: dashboardHeaderSchema.optional(),
});

export function safeParseDashboardConfig(input: unknown) {
  return dashboardConfigSchema.safeParse(input);
}
