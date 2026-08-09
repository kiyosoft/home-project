import { useMemo, useState } from "react";
import {
  TextCardBody,
  textCardConfigSchema,
} from "@ethio/core";
import {
  collectTemplateIssues,
  sanitizeRichText,
} from "@ethio/plugin-sdk";

import { RichTextEditor } from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";

interface TextCardSettingsFormProps {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}

type VerticalAlign = "start" | "center" | "end";
type Padding = "none" | "sm" | "md" | "lg";
type BackgroundType = "none" | "color" | "image";
type BackgroundFit = "cover" | "contain";

interface Draft {
  title: string;
  html: string;
  vertical_align: VerticalAlign;
  padding: Padding;
  background_type: BackgroundType;
  background_color: string;
  background_image: string;
  background_fit: BackgroundFit;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toDraft(config: Record<string, unknown>): Draft {
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
        : "center"
    ) as VerticalAlign,
    padding: (
      ["none", "sm", "md", "lg"].includes(padding) ? padding : "md"
    ) as Padding,
    background_type: (
      ["none", "color", "image"].includes(backgroundType)
        ? backgroundType
        : "none"
    ) as BackgroundType,
    background_color: asString(config.background_color),
    background_image: asString(config.background_image),
    background_fit: (
      ["cover", "contain"].includes(backgroundFit) ? backgroundFit : "cover"
    ) as BackgroundFit,
  };
}

export function TextCardSettingsForm({
  config,
  onSave,
  onCancel,
}: TextCardSettingsFormProps) {
  const locale = useLocaleStore((state) => state.locale);
  const entities = useHaStore((state) => state.entities);
  const [draft, setDraft] = useState<Draft>(() => toDraft(config));
  const [error, setError] = useState<string | null>(null);

  const issues = useMemo(
    () => collectTemplateIssues(draft.html, entities),
    [draft.html, entities],
  );

  function patch(partial: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  function handleSave() {
    const cleaned = {
      ...draft,
      html: sanitizeRichText(draft.html),
    };
    const parsed = textCardConfigSchema.safeParse(cleaned);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid config");
      return;
    }
    onSave(parsed.data as Record<string, unknown>);
  }

  return (
    <div className="space-y-4">
      <label className="block space-y-2 text-sm">
        <span className="font-medium">{t(locale, "schema.title")}</span>
        <Input
          value={draft.title}
          placeholder={t(locale, "textCard.titlePlaceholder")}
          onChange={(event) => patch({ title: event.target.value })}
        />
      </label>

      <RichTextEditor
        value={draft.html}
        onChange={(html) => patch({ html })}
        placeholder={t(locale, "textCard.placeholder")}
      />

      {issues.length > 0 ? (
        <ul className="space-y-1 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          {issues.map((issue) => (
            <li key={`${issue.kind}:${issue.path ?? issue.message}`}>
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-2 text-sm">
          <span className="font-medium">{t(locale, "textCard.verticalAlign")}</span>
          <select
            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
            value={draft.vertical_align}
            onChange={(event) =>
              patch({ vertical_align: event.target.value as VerticalAlign })
            }
          >
            <option value="start">{t(locale, "textCard.alignStart")}</option>
            <option value="center">{t(locale, "textCard.alignMiddle")}</option>
            <option value="end">{t(locale, "textCard.alignEnd")}</option>
          </select>
        </label>
        <label className="block space-y-2 text-sm">
          <span className="font-medium">{t(locale, "textCard.padding")}</span>
          <select
            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
            value={draft.padding}
            onChange={(event) =>
              patch({ padding: event.target.value as Padding })
            }
          >
            {(["none", "sm", "md", "lg"] as const).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-3 rounded-2xl border border-border p-3">
        <p className="text-sm font-medium">{t(locale, "textCard.background")}</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["none", "textCard.bg.none"],
              ["color", "textCard.bg.color"],
              ["image", "textCard.bg.image"],
            ] as const
          ).map(([type, labelKey]) => (
            <Button
              key={type}
              type="button"
              size="sm"
              variant={draft.background_type === type ? "default" : "outline"}
              onClick={() => patch({ background_type: type })}
            >
              {t(locale, labelKey)}
            </Button>
          ))}
        </div>

        {draft.background_type === "color" ? (
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <span className="sr-only">{t(locale, "textCard.color")}</span>
              <input
                type="color"
                aria-label={t(locale, "textCard.color")}
                className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                value={
                  /^#[0-9a-fA-F]{6}$/.test(draft.background_color.trim())
                    ? draft.background_color.trim()
                    : "#1f2937"
                }
                onChange={(event) =>
                  patch({ background_color: event.target.value })
                }
              />
            </label>
            <Input
              value={draft.background_color}
              placeholder="#1f2937 or hsl(...)"
              aria-label={t(locale, "textCard.color")}
              onChange={(event) =>
                patch({ background_color: event.target.value })
              }
            />
          </div>
        ) : null}

        {draft.background_type === "image" ? (
          <div className="space-y-2">
            <Input
              value={draft.background_image}
              placeholder="https://…"
              onChange={(event) =>
                patch({ background_image: event.target.value })
              }
            />
            <div className="flex gap-2">
              {(["cover", "contain"] as const).map((fit) => (
                <Button
                  key={fit}
                  type="button"
                  size="sm"
                  variant={
                    draft.background_fit === fit ? "default" : "outline"
                  }
                  onClick={() => patch({ background_fit: fit })}
                >
                  {fit}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="min-h-24 overflow-hidden rounded-2xl border border-dashed border-border">
        <p className="border-b border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {t(locale, "textCard.preview")}
        </p>
        <TextCardBody
          config={draft as unknown as Record<string, unknown>}
          entities={entities}
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          {t(locale, "schema.cancel")}
        </Button>
        <Button onClick={handleSave}>{t(locale, "schema.apply")}</Button>
      </div>
    </div>
  );
}
