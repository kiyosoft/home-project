import { Check, ListChecks } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { z } from "zod";

import {
  defineWidget,
  PluginScope,
  TODO_FEATURE,
  todoSupportsFeature,
  useCallService,
  useDetailModal,
  useEntity,
  usePluginId,
  useTodoItems,
  type TodoItem,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

import { TodoDetailBody } from "./todo/TodoDetailBody";

export const todoConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
  showCompleted: z.boolean().default(false),
  maxItems: z.coerce.number().int().min(1).max(20).default(5),
});

function getFriendlyName(entity: {
  entity_id: string;
  attributes: Record<string, unknown>;
}): string {
  const name = entity.attributes.friendly_name;
  if (typeof name === "string" && name.trim()) return name;
  return entity.entity_id;
}

function supportedFeatures(entity: {
  attributes: Record<string, unknown>;
}): number {
  const value = entity.attributes.supported_features;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stopPropagation(event: MouseEvent) {
  event.stopPropagation();
}

function TodoWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
  const customTitle =
    typeof config.title === "string" ? config.title.trim() : "";
  const showCompleted = Boolean(config.showCompleted);
  const maxItemsRaw =
    typeof config.maxItems === "number"
      ? config.maxItems
      : Number(config.maxItems);
  const maxItems =
    Number.isFinite(maxItemsRaw) && maxItemsRaw > 0
      ? Math.min(20, Math.floor(maxItemsRaw))
      : 5;

  const entity = useEntity(entityId);
  const { items, loading, error } = useTodoItems(entityId);
  const callService = useCallService();
  const detailModal = useDetailModal();
  const pluginId = usePluginId();
  const [pending, setPending] = useState(false);

  if (!entityId) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <h3 className="font-display text-base font-semibold">
          {customTitle || "To-do"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a to-do list entity in settings.
        </p>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-dashed border-border bg-card p-5">
        <h3 className="font-display text-base font-semibold">
          {customTitle || entityId}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">Entity unavailable</p>
      </div>
    );
  }

  const features = supportedFeatures(entity);
  const canUpdate = todoSupportsFeature(
    features,
    TODO_FEATURE.UPDATE_TODO_ITEM,
  );
  const incomplete = items.filter((item) => item.status === "needs_action");
  const completed = items.filter((item) => item.status === "completed");
  const preview = (showCompleted ? items : incomplete).slice(0, maxItems);
  const name = customTitle || getFriendlyName(entity);
  const count =
    Number.isFinite(Number(entity.state)) && entity.state !== ""
      ? Number(entity.state)
      : incomplete.length;

  async function toggleItem(item: TodoItem) {
    if (!interactive || pending || !canUpdate) return;
    setPending(true);
    try {
      await callService("todo", "update_item", {
        entity_id: entityId,
        item: item.uid,
        status: item.status === "completed" ? "needs_action" : "completed",
      });
    } finally {
      setPending(false);
    }
  }

  function openDetail() {
    if (!interactive || !pluginId) return;
    detailModal.open({
      title: name,
      description: "To-do list",
      className: "max-w-lg",
      body: (
        <PluginScope pluginId={pluginId}>
          <TodoDetailBody entityId={entityId} />
        </PluginScope>
      ),
    });
  }

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? openDetail : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDetail();
              }
            }
          : undefined
      }
      className={`flex h-full min-h-36 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm outline-none transition-colors ${
        interactive
          ? "cursor-pointer hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            To-do
          </p>
          <h3 className="mt-1 truncate font-display text-base font-semibold tracking-tight">
            {name}
          </h3>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <ListChecks className="h-4 w-4" />
        </div>
      </div>

      <p className="mt-4 font-display text-3xl font-semibold tracking-tight">
        {count}
        <span className="ml-1 text-lg font-normal text-muted-foreground">
          open
        </span>
      </p>

      <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!loading && !error && preview.length === 0 ? (
          <p className="text-sm text-muted-foreground">All caught up</p>
        ) : null}
        {!loading && !error
          ? preview.map((item) => {
              const done = item.status === "completed";
              return (
                <div
                  key={item.uid}
                  className="flex items-center gap-2 rounded-lg py-1"
                >
                  <button
                    type="button"
                    disabled={!interactive || pending || !canUpdate}
                    onClick={(event) => {
                      stopPropagation(event);
                      void toggleItem(item);
                    }}
                    className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border disabled:opacity-50 ${
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    }`}
                    aria-label={done ? "Mark incomplete" : "Mark complete"}
                  >
                    {done ? <Check className="h-2.5 w-2.5" /> : null}
                  </button>
                  <span
                    className={`truncate text-sm ${
                      done
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  >
                    {item.summary}
                  </span>
                </div>
              );
            })
          : null}
      </div>

      {showCompleted && completed.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {completed.length} completed
        </p>
      ) : null}
    </div>
  );
}

export const todoWidget = defineWidget({
  id: "@ethio/core/todo",
  name: "To-do List",
  description: "View and manage a Home Assistant to-do list",
  component: TodoWidget,
  configSchema: todoConfigSchema,
  defaultConfig: { title: "", entity_id: "", showCompleted: false, maxItems: 5 },
  defaultSize: { w: 4, h: 5, minW: 3, minH: 3, maxW: 8, maxH: 10 },
  minSize: { w: 3, h: 3 },
  maxSize: { w: 8, h: 10 },
  entityDomains: ["todo"],
  capabilities: ["entity.read", "service.call"],
});
