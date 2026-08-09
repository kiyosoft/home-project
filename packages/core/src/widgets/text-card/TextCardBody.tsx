import { memo, useMemo, type CSSProperties } from "react";

import {
  renderTemplate,
  sanitizeRichText,
  type HassEntities,
} from "@ethio/plugin-sdk";

import {
  type TextCardConfig,
  textCardConfigSchema,
} from "./text-card-config";

const PADDING_CLASS: Record<string, string> = {
  none: "p-0",
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

const ALIGN_CLASS: Record<string, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
};

const DEFAULT_CONFIG: TextCardConfig = textCardConfigSchema.parse({});

function cssUrl(url: string): string {
  return `url("${url.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** Light config read — avoid zod.safeParse on every animation frame / entity tick. */
function readConfig(config: Record<string, unknown>): TextCardConfig {
  const verticalAlign = asString(config.vertical_align, "center");
  const padding = asString(config.padding, "md");
  const backgroundType = asString(config.background_type, "none");
  const backgroundFit = asString(config.background_fit, "cover");

  return {
    title: asString(config.title),
    html: asString(config.html),
    vertical_align: (
      ["start", "center", "end"].includes(verticalAlign)
        ? verticalAlign
        : DEFAULT_CONFIG.vertical_align
    ) as TextCardConfig["vertical_align"],
    padding: (
      ["none", "sm", "md", "lg"].includes(padding)
        ? padding
        : DEFAULT_CONFIG.padding
    ) as TextCardConfig["padding"],
    background_type: (
      ["none", "color", "image"].includes(backgroundType)
        ? backgroundType
        : DEFAULT_CONFIG.background_type
    ) as TextCardConfig["background_type"],
    background_color: asString(config.background_color),
    background_image: asString(config.background_image),
    background_fit: (
      ["cover", "contain"].includes(backgroundFit)
        ? backgroundFit
        : DEFAULT_CONFIG.background_fit
    ) as TextCardConfig["background_fit"],
  };
}

export const TextCardBody = memo(function TextCardBody({
  config,
  entities,
}: {
  config: Record<string, unknown>;
  entities: HassEntities;
}) {
  const cfg = useMemo(() => readConfig(config), [config]);
  const title = cfg.title.trim();

  const rendered = useMemo(
    () => sanitizeRichText(renderTemplate(cfg.html, entities)),
    [cfg.html, entities],
  );

  const style = useMemo(() => {
    const next: CSSProperties = {};
    if (cfg.background_type === "color" && cfg.background_color.trim()) {
      next.backgroundColor = cfg.background_color.trim();
    }
    if (cfg.background_type === "image" && cfg.background_image.trim()) {
      next.backgroundImage = cssUrl(cfg.background_image.trim());
      next.backgroundSize =
        cfg.background_fit === "contain" ? "contain" : "cover";
      next.backgroundPosition = "center";
      next.backgroundRepeat = "no-repeat";
    }
    return next;
  }, [
    cfg.background_type,
    cfg.background_color,
    cfg.background_image,
    cfg.background_fit,
  ]);

  return (
    <div
      className={`flex h-full min-h-36 flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm ${
        PADDING_CLASS[cfg.padding] ?? PADDING_CLASS.md
      } ${ALIGN_CLASS[cfg.vertical_align] ?? ALIGN_CLASS.center}`}
      style={style}
    >
      {title ? (
        <h3 className="mb-2 shrink-0 font-display text-base font-semibold tracking-tight">
          {title}
        </h3>
      ) : null}
      <div
        className="rich-text min-h-0 flex-1 overflow-auto"
        dangerouslySetInnerHTML={{ __html: rendered || "&nbsp;" }}
      />
    </div>
  );
});
