import { Check, Trash2, X } from "lucide-react";
import { type KeyboardEvent } from "react";

import type { TodoItem } from "@ethio/plugin-sdk";

export function TodoItemList({
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
                  <label className="sr-only" htmlFor={`todo-rename-${item.uid}`}>
                    Rename item
                  </label>
                  <input
                    id={`todo-rename-${item.uid}`}
                    type="text"
                    value={renameDraft}
                    autoFocus
                    disabled={pending}
                    aria-label="Rename item"
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
