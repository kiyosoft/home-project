import { Check, ListChecks, Plus, Trash2, X } from "lucide-react";
import {
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
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

export const todoConfigSchema = z.object({
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

function TodoDetailBody({ entityId }: { entityId: string }) {
  const entity = useEntity(entityId);
  const { items, loading, error } = useTodoItems(entityId);
  const callService = useCallService();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  if (!entity) {
    return <p className="text-sm text-muted-foreground">Entity unavailable</p>;
  }

  const features = supportedFeatures(entity);
  const canCreate = todoSupportsFeature(
    features,
    TODO_FEATURE.CREATE_TODO_ITEM,
  );
  const canUpdate = todoSupportsFeature(
    features,
    TODO_FEATURE.UPDATE_TODO_ITEM,
  );
  const canDelete = todoSupportsFeature(
    features,
    TODO_FEATURE.DELETE_TODO_ITEM,
  );

  const incomplete = items.filter((item) => item.status === "needs_action");
  const completed = items.filter((item) => item.status === "completed");

  async function run(
    service: string,
    data: Record<string, unknown> = {},
  ) {
    if (pending) return;
    setPending(true);
    try {
      await callService("todo", service, {
        entity_id: entityId,
        ...data,
      });
    } finally {
      setPending(false);
    }
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    const summary = draft.trim();
    if (!summary || !canCreate) return;
    await run("add_item", { item: summary });
    setDraft("");
  }

  async function toggleItem(item: TodoItem) {
    if (!canUpdate) return;
    await run("update_item", {
      item: item.uid,
      status: item.status === "completed" ? "needs_action" : "completed",
    });
  }

  async function removeItem(item: TodoItem) {
    if (!canDelete) return;
    await run("remove_item", { item: item.uid });
  }

  async function saveRename(item: TodoItem) {
    const next = renameDraft.trim();
    if (!canUpdate || !next || next === item.summary) {
      setEditingUid(null);
      return;
    }
    await run("update_item", { item: item.uid, rename: next });
    setEditingUid(null);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="font-display text-lg font-semibold tracking-tight">
          {getFriendlyName(entity)}
        </p>
        <p className="text-sm text-muted-foreground">
          {incomplete.length} open · {completed.length} done
        </p>
      </div>

      {canCreate ? (
        <form onSubmit={(event) => void handleAdd(event)} className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add an item…"
            disabled={pending}
            className="flex h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            aria-label="Add item"
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!loading && !error ? (
        <div className="space-y-4">
          <TodoItemList
            items={incomplete}
            emptyLabel="No open items"
            pending={pending}
            canUpdate={canUpdate}
            canDelete={canDelete}
            editingUid={editingUid}
            renameDraft={renameDraft}
            onToggle={(item) => void toggleItem(item)}
            onRemove={(item) => void removeItem(item)}
            onStartEdit={(item) => {
              setEditingUid(item.uid);
              setRenameDraft(item.summary);
            }}
            onRenameChange={setRenameDraft}
            onSaveRename={(item) => void saveRename(item)}
            onCancelEdit={() => setEditingUid(null)}
          />

          {completed.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowCompleted((prev) => !prev)}
                  className="text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
                >
                  Completed ({completed.length})
                </button>
                {canDelete ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void run("remove_completed_items")}
                    className="text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
                  >
                    Clear completed
                  </button>
                ) : null}
              </div>
              {showCompleted ? (
                <TodoItemList
                  items={completed}
                  emptyLabel=""
                  pending={pending}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  editingUid={editingUid}
                  renameDraft={renameDraft}
                  onToggle={(item) => void toggleItem(item)}
                  onRemove={(item) => void removeItem(item)}
                  onStartEdit={(item) => {
                    setEditingUid(item.uid);
                    setRenameDraft(item.summary);
                  }}
                  onRenameChange={setRenameDraft}
                  onSaveRename={(item) => void saveRename(item)}
                  onCancelEdit={() => setEditingUid(null)}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TodoItemList({
  items,
  emptyLabel,
  pending,
  canUpdate,
  canDelete,
  editingUid,
  renameDraft,
  onToggle,
  onRemove,
  onStartEdit,
  onRenameChange,
  onSaveRename,
  onCancelEdit,
}: {
  items: TodoItem[];
  emptyLabel: string;
  pending: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  editingUid: string | null;
  renameDraft: string;
  onToggle: (item: TodoItem) => void;
  onRemove: (item: TodoItem) => void;
  onStartEdit: (item: TodoItem) => void;
  onRenameChange: (value: string) => void;
  onSaveRename: (item: TodoItem) => void;
  onCancelEdit: () => void;
}) {
  if (items.length === 0) {
    return emptyLabel ? (
      <p className="text-sm text-muted-foreground">{emptyLabel}</p>
    ) : null;
  }

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const done = item.status === "completed";
        const editing = editingUid === item.uid;
        return (
          <li
            key={item.uid}
            className="flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-muted/60"
          >
            <button
              type="button"
              disabled={pending || !canUpdate}
              onClick={() => onToggle(item)}
              className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-50 ${
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:border-primary/50"
              }`}
              aria-label={done ? "Mark incomplete" : "Mark complete"}
            >
              {done ? <Check className="h-3 w-3" /> : null}
            </button>

            <div className="min-w-0 flex-1">
              {editing ? (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={renameDraft}
                    autoFocus
                    disabled={pending}
                    onChange={(event) => onRenameChange(event.target.value)}
                    onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onSaveRename(item);
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        onCancelEdit();
                      }
                    }}
                    className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onSaveRename(item)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-50"
                    aria-label="Save rename"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={onCancelEdit}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-50"
                    aria-label="Cancel rename"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!canUpdate}
                  onClick={() => onStartEdit(item)}
                  className={`block w-full truncate text-left text-sm disabled:cursor-default ${
                    done
                      ? "text-muted-foreground line-through"
                      : "font-medium text-foreground"
                  }`}
                >
                  {item.summary}
                </button>
              )}
              {item.due && !editing ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Due {item.due}
                </p>
              ) : null}
            </div>

            {canDelete ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => onRemove(item)}
                className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
                aria-label="Delete item"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function TodoWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
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
        <h3 className="font-display text-base font-semibold">To-do</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a to-do list entity in settings.
        </p>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-dashed border-border bg-card p-5">
        <h3 className="font-display text-base font-semibold">{entityId}</h3>
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
  const name = getFriendlyName(entity);
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
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
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
  defaultConfig: { entity_id: "", showCompleted: false, maxItems: 5 },
  defaultSize: { w: 4, h: 5, minW: 3, minH: 3, maxW: 8, maxH: 10 },
  minSize: { w: 3, h: 3 },
  maxSize: { w: 8, h: 10 },
  entityDomains: ["todo"],
  capabilities: ["entity.read", "service.call"],
});
