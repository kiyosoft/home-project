import {
  Activity,
  Lightbulb,
  Play,
  Plus,
  Shield,
  Sparkles,
  Speaker,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  resolveEntityImageUrl,
  useBaseUrl,
  useEntityDetail,
  useRenderTemplate,
} from "@ethio/plugin-sdk";

import { PillDialog } from "@/components/PillDialog";
import type { HeaderPillConfig } from "@/dashboard/types";
import { useLongPress } from "@/hooks/useLongPress";
import { t } from "@/i18n";
import { getFriendlyName } from "@/lib/entities";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";

const DOMAIN_ICON: Record<string, LucideIcon> = {
  person: User,
  device_tracker: User,
  media_player: Speaker,
  alarm_control_panel: Shield,
  light: Lightbulb,
  scene: Sparkles,
  script: Play,
};

const ACTION_DOMAINS = new Set(["scene", "script"]);

const FLASH_MS = 600;

function domainOf(entityId: string): string {
  return entityId.split(".")[0] ?? "";
}

function HeaderPill({
  pill,
  canManage,
  onEdit,
  onRemove,
}: {
  pill: HeaderPillConfig;
  canManage: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const locale = useLocaleStore((state) => state.locale);
  const entityId = pill.entity_id?.trim() ?? "";
  const template = pill.template?.trim() ?? "";
  const domain = entityId ? domainOf(entityId) : "";
  const isAction = ACTION_DOMAINS.has(domain);
  const entity = useHaStore((state) =>
    entityId ? state.entities[entityId] : undefined,
  );
  const callService = useHaStore((state) => state.callService);
  const baseUrl = useBaseUrl();
  const entityDetail = useEntityDetail();
  const { html, error } = useRenderTemplate(template);
  const lastGood = useRef("");
  const [flashing, setFlashing] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const activate = () => {
    void callService(domain, "turn_on", { entity_id: entityId }).catch(() => {});
    setFlashing(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashing(false), FLASH_MS);
  };

  const onTap = isAction
    ? activate
    : entityId
      ? () => entityDetail.open(entityId)
      : canManage
        ? onEdit
        : undefined;

  const longPress = useLongPress({
    ms: 500,
    disabled: !canManage,
    onLongPress: onEdit,
    onClick: onTap,
  });

  const rendered = html.trim();
  if (rendered) lastGood.current = rendered;

  let title = "";
  let subtitle: string | undefined;
  let hidden = false;

  if (template) {
    title = rendered || (error ? lastGood.current : "");
    if (!title && !canManage) hidden = true;
    else if (!title) title = t(locale, "header.pillUnavailable");
    if (entity) subtitle = getFriendlyName(entity);
  } else if (entity) {
    if (isAction) {
      title = flashing ? t(locale, "header.pillActivated") : getFriendlyName(entity);
    } else {
      title = entity.state;
      subtitle = getFriendlyName(entity);
    }
  } else if (entityId) {
    title = t(locale, "header.pillUnavailable");
    subtitle = entityId;
  } else if (canManage) {
    title = t(locale, "header.pillUnavailable");
  } else {
    hidden = true;
  }

  if (hidden) return null;

  const picture = entity
    ? resolveEntityImageUrl(
        typeof entity.attributes.entity_picture === "string"
          ? entity.attributes.entity_picture
          : undefined,
        baseUrl,
      )
    : null;
  const Icon = DOMAIN_ICON[domain] ?? Activity;
  const showPresence = domain === "person" || domain === "device_tracker";
  const home = entity?.state === "home";
  const running = isAction && entity?.state === "on";
  const lit = flashing || running;
  const muted = Boolean(!entity && entityId) || Boolean(error && !rendered);

  return (
    <div className="relative inline-flex">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onTap?.();
          }
        }}
        {...longPress}
        className={cn(
          "inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card py-1.5 pr-4 pl-2.5 text-left text-card-foreground outline-none",
          "cursor-pointer hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring",
          canManage && "pr-8",
          muted && "opacity-70",
          lit && "border-primary bg-primary/10",
        )}
      >
        {entityId ? (
          <span className="relative shrink-0">
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-muted">
              {picture ? (
                <img
                  src={picture}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Icon className="h-4 w-4 text-muted-foreground" />
              )}
            </span>
            {showPresence ? (
              <span
                className={cn(
                  "absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-card",
                  home ? "bg-success" : "bg-muted-foreground",
                )}
                aria-hidden
              />
            ) : null}
          </span>
        ) : null}
        <span className="min-w-0">
          <span
            className={cn(
              "block truncate text-xs font-medium",
              !template && !isAction && "capitalize",
            )}
          >
            {title}
          </span>
          {subtitle ? (
            <span className="block truncate text-[0.65rem] text-muted-foreground">
              {subtitle}
            </span>
          ) : null}
        </span>
      </div>
      {canManage ? (
        <button
          type="button"
          aria-label={t(locale, "settings.pillsRemove")}
          onClick={onRemove}
          className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground outline-none hover:bg-destructive hover:text-white focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}

export function HeaderPills({
  pills,
  canAdd = false,
}: {
  pills: HeaderPillConfig[];
  canAdd?: boolean;
}) {
  const locale = useLocaleStore((state) => state.locale);
  const [addOpen, setAddOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const pinHash = useDashboardStore((state) => state.pinHash);
  const unlocked = useDashboardStore((state) => state.unlocked);
  const openPinDialog = useDashboardStore((state) => state.openPinDialog);
  const updateHeader = useDashboardStore((state) => state.updateHeader);

  if (pills.length === 0 && !canAdd) return null;

  function ensureUnlocked(): boolean {
    if (pinHash && !unlocked) {
      openPinDialog("settings");
      return false;
    }
    return true;
  }

  function requestAdd() {
    if (!ensureUnlocked()) return;
    setAddOpen(true);
  }

  function requestEdit(index: number) {
    if (!ensureUnlocked()) return;
    setEditIndex(index);
  }

  function removeAt(index: number) {
    if (!ensureUnlocked()) return;
    updateHeader({ pills: pills.filter((_, i) => i !== index) });
    setEditIndex(null);
  }

  const editing = editIndex !== null ? pills[editIndex] : null;

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {pills.map((pill, index) => (
          <HeaderPill
            key={`${pill.entity_id ?? ""}:${pill.template ?? ""}:${index}`}
            pill={pill}
            canManage={canAdd}
            onEdit={() => requestEdit(index)}
            onRemove={() => removeAt(index)}
          />
        ))}
        {canAdd ? (
          <button
            type="button"
            onClick={requestAdd}
            aria-label={t(locale, "settings.pillsAddAria")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-border bg-card text-muted-foreground outline-none hover:border-primary/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {canAdd ? (
        <>
          <PillDialog
            open={addOpen}
            onClose={() => setAddOpen(false)}
            existingEntityIds={pills
              .map((pill) => pill.entity_id?.trim() ?? "")
              .filter(Boolean)}
            onSave={(pill) => {
              updateHeader({ pills: [...pills, pill] });
              setAddOpen(false);
            }}
          />
          <PillDialog
            open={editIndex !== null}
            onClose={() => setEditIndex(null)}
            initial={editing}
            existingEntityIds={pills
              .map((pill, i) =>
                i === editIndex ? "" : (pill.entity_id?.trim() ?? ""),
              )
              .filter(Boolean)}
            onSave={(pill) => {
              if (editIndex === null) return;
              updateHeader({
                pills: pills.map((item, i) => (i === editIndex ? pill : item)),
              });
              setEditIndex(null);
            }}
            onDelete={
              editIndex === null ? undefined : () => removeAt(editIndex)
            }
          />
        </>
      ) : null}
    </>
  );
}
