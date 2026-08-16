import { useEffect, useState } from "react";

import { EntityPicker } from "@/components/EntityPicker";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { HeaderPillConfig } from "@/dashboard/types";
import { t } from "@/i18n";
import { useLocaleStore } from "@/store/locale-store";

interface PillDialogProps {
  open: boolean;
  onClose: () => void;
  initial?: HeaderPillConfig | null;
  onSave: (pill: HeaderPillConfig) => void;
  onDelete?: () => void;
  existingEntityIds: string[];
}

export function PillDialog({
  open,
  onClose,
  initial,
  onSave,
  onDelete,
  existingEntityIds,
}: PillDialogProps) {
  const locale = useLocaleStore((state) => state.locale);
  const [entityId, setEntityId] = useState("");
  const [template, setTemplate] = useState("");
  const editing = Boolean(initial);

  useEffect(() => {
    if (!open) return;
    setEntityId(initial?.entity_id ?? "");
    setTemplate(initial?.template ?? "");
  }, [open, initial]);

  const trimmedEntity = entityId.trim();
  const canSave = Boolean(trimmedEntity || template.trim());

  function handleSave() {
    if (!canSave) return;
    if (
      !editing &&
      trimmedEntity &&
      existingEntityIds.includes(trimmedEntity) &&
      !template.trim()
    ) {
      onClose();
      return;
    }
    const next: HeaderPillConfig = {};
    if (trimmedEntity) next.entity_id = trimmedEntity;
    if (template.trim()) next.template = template;
    onSave(next);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t(
        locale,
        editing ? "settings.pillsEditTitle" : "settings.pillsAddTitle",
      )}
      description={t(locale, "settings.pillsAddDescription")}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {editing && onDelete ? (
            <Button
              variant="outline"
              size="sm"
              className="mr-auto text-destructive"
              onClick={onDelete}
            >
              {t(locale, "settings.pillsRemove")}
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={onClose}>
            {t(locale, "schema.cancel")}
          </Button>
          <Button size="sm" disabled={!canSave} onClick={handleSave}>
            {t(locale, editing ? "settings.pillsSave" : "settings.pillsAdd")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <span className="text-xs font-medium">
            {t(locale, "settings.pillsEntity")}
          </span>
          <EntityPicker value={entityId} onChange={setEntityId} />
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-medium">
            {t(locale, "settings.pillsTemplate")}
          </span>
          <textarea
            className="min-h-24 w-full rounded-xl border border-border bg-card px-3 py-2 font-mono text-xs"
            value={template}
            placeholder={t(locale, "settings.pillsTemplatePlaceholder")}
            onChange={(event) => setTemplate(event.target.value)}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          {t(locale, "textCard.templateHint")}
        </p>
      </div>
    </Dialog>
  );
}
