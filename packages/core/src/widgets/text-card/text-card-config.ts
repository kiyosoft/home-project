import { z } from "zod";

export const textCardConfigSchema = z.object({
  title: z.string().default(""),
  html: z.string().default(""),
  vertical_align: z.enum(["start", "center", "end"]).default("center"),
  padding: z.enum(["none", "sm", "md", "lg"]).default("md"),
  background_type: z.enum(["none", "color", "image"]).default("none"),
  background_color: z.string().default(""),
  background_image: z.string().default(""),
  background_fit: z.enum(["cover", "contain"]).default("cover"),
});

export type TextCardConfig = z.infer<typeof textCardConfigSchema>;
