import { z } from "zod";

export const widgetTypeSchema = z.string().min(1);

export const tileSizeSchema = z.enum(["sm", "md"]);

export const mobileWidgetSchema = z.object({
  id: z.string().min(1),
  type: widgetTypeSchema,
  config: z.record(z.string(), z.unknown()),
  size: tileSizeSchema.optional(),
});

export const explicitSourceSchema = z.object({
  kind: z.literal("explicit"),
  widgets: z.array(mobileWidgetSchema),
});

export const areaSourceSchema = z.object({
  kind: z.literal("area"),
  areaId: z.string().min(1),
  exclude: z.array(z.string()).optional(),
});

export const domainSourceSchema = z.object({
  kind: z.literal("domain"),
  domains: z.array(z.string().min(1)).min(1),
  areaId: z.string().min(1).optional(),
  exclude: z.array(z.string()).optional(),
});

export const sceneSourceSchema = z.object({
  kind: z.literal("scene"),
  entities: z.array(z.string().min(1)),
});

export const sectionSourceSchema = z.discriminatedUnion("kind", [
  explicitSourceSchema,
  areaSourceSchema,
  domainSourceSchema,
  sceneSourceSchema,
]);

export const mobileSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  source: sectionSourceSchema,
  collapsed: z.boolean().optional(),
});

export const mobileDashboardSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  title: z.string().min(1),
  favorites: z.array(z.string().min(1)).optional(),
  sizes: z.record(z.string(), tileSizeSchema).optional(),
  sections: z.array(mobileSectionSchema),
});

export function safeParseMobileDashboard(input: unknown) {
  return mobileDashboardSchema.safeParse(input);
}
