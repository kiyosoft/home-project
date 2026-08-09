import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";

import {
  TODO_FEATURE,
  todoSupportsFeature,
  useCallService,
  useEntity,
  useTodoItems,
  type TodoItem,
} from "@ethio/plugin-sdk";

import { TodoItemList } from "./TodoItemList";

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

export function TodoDetailBody({ entityId }: { entityId: string }) {
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
          <label className="sr-only" htmlFor="todo-add-item">
            Add an item
          </label>
          <input
            id="todo-add-item"
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
            emptyLabel="Nothing open"
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
              <button
                type="button"
                onClick={() => setShowCompleted((prev) => !prev)}
                className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
              >
                {showCompleted ? "Hide" : "Show"} completed ({completed.length})
              </button>
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
