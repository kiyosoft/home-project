import { useMemo, useState } from "react";
import { z } from "zod";

import { EntityPicker } from "@/components/EntityPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getWidgetOrThrow } from "@/plugins/registry";

interface SchemaFormProps {
  type: string;
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}

function shapeEntries(schema: z.ZodTypeAny): [string, z.ZodTypeAny][] {
  if (schema instanceof z.ZodObject) {
    return Object.entries(schema.shape) as [string, z.ZodTypeAny][];
  }
  return [["entity_id", z.string()]];
}

function looksBoolean(
  field: string,
  fieldSchema: z.ZodTypeAny,
  defaultConfig: Record<string, unknown>,
): boolean {
  if (typeof defaultConfig[field] === "boolean") return true;
  return fieldSchema.safeParse(true).success && fieldSchema.safeParse(false).success;
}

function enumOptions(
  field: string,
  fieldSchema: z.ZodTypeAny,
  defaultConfig: Record<string, unknown>,
): string[] | null {
  if (field === "home_side") return ["left", "right"];
  const sample = defaultConfig[field];
  if (typeof sample === "string") {
    const leftOk = fieldSchema.safeParse("left").success;
    const rightOk = fieldSchema.safeParse("right").success;
    if (leftOk && rightOk) return ["left", "right"];
  }
  return null;
}

export function SchemaForm({ type, config, onSave, onCancel }: SchemaFormProps) {
  const def = getWidgetOrThrow(type);
  const [draft, setDraft] = useState<Record<string, unknown>>({
    ...def.defaultConfig,
    ...config,
  });
  const [error, setError] = useState<string | null>(null);

  const fields = useMemo(
    () => shapeEntries(def.configSchema),
    [def.configSchema],
  );

  function handleSave() {
    const parsed = def.configSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid config");
      return;
    }
    onSave(parsed.data as Record<string, unknown>);
  }

  return (
    <div className="space-y-4">
      {fields.map(([field, fieldSchema]) => {
        if (field === "entity_id") {
          return (
            <label key={field} className="block space-y-2 text-sm">
              <span className="font-medium">Entity</span>
              <EntityPicker
                value={typeof draft.entity_id === "string" ? draft.entity_id : ""}
                domains={def.entityDomains}
                onChange={(entityId) =>
                  setDraft((prev) => ({ ...prev, entity_id: entityId }))
                }
              />
            </label>
          );
        }

        if (looksBoolean(field, fieldSchema, def.defaultConfig)) {
          return (
            <label
              key={field}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="font-medium">{field}</span>
              <input
                type="checkbox"
                checked={Boolean(draft[field])}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [field]: event.target.checked,
                  }))
                }
                className="h-4 w-4 accent-primary"
              />
            </label>
          );
        }

        const options = enumOptions(field, fieldSchema, def.defaultConfig);
        if (options) {
          return (
            <label key={field} className="block space-y-2 text-sm">
              <span className="font-medium">{field}</span>
              <select
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                value={
                  typeof draft[field] === "string" ? draft[field] : options[0] ?? ""
                }
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, [field]: event.target.value }))
                }
              >
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          );
        }

        return (
          <label key={field} className="block space-y-2 text-sm">
            <span className="font-medium">{field}</span>
            <Input
              value={
                typeof draft[field] === "string" || typeof draft[field] === "number"
                  ? String(draft[field])
                  : ""
              }
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, [field]: event.target.value }))
              }
            />
          </label>
        );
      })}

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Apply</Button>
      </div>
    </div>
  );
}
