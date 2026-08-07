export type TodoItemStatus = "needs_action" | "completed";

export interface TodoItem {
  uid: string;
  summary: string;
  status: TodoItemStatus;
  due?: string;
  description?: string;
}

/** Bit flags from homeassistant.components.todo.TodoListEntityFeature */
export const TODO_FEATURE = {
  CREATE_TODO_ITEM: 1,
  DELETE_TODO_ITEM: 2,
  UPDATE_TODO_ITEM: 4,
  MOVE_TODO_ITEM: 8,
  SET_DUE_DATE_ON_ITEM: 16,
  SET_DUE_DATETIME_ON_ITEM: 32,
  SET_DESCRIPTION_ON_ITEM: 64,
} as const;

export function todoSupportsFeature(
  supportedFeatures: number,
  bit: number,
): boolean {
  return (supportedFeatures & bit) !== 0;
}

interface TodoItemsResult {
  items?: unknown;
}

function normalizeItem(value: unknown): TodoItem | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const uid = typeof raw.uid === "string" ? raw.uid : "";
  const summary = typeof raw.summary === "string" ? raw.summary : "";
  if (!uid) return null;
  const item: TodoItem = {
    uid,
    summary,
    status: raw.status === "completed" ? "completed" : "needs_action",
  };
  if (typeof raw.due === "string" && raw.due) item.due = raw.due;
  if (typeof raw.description === "string" && raw.description) {
    item.description = raw.description;
  }
  return item;
}

/** HA sends null-valued fields over the subscribe channel, so normalize both paths. */
export function normalizeTodoItems(result: unknown): TodoItem[] {
  const items = (result as TodoItemsResult | null)?.items;
  if (!Array.isArray(items)) return [];
  return items
    .map(normalizeItem)
    .filter((item): item is TodoItem => item !== null);
}

/** One-shot fetch of the items in a to-do list. */
export async function listTodoItems(
  sendMessagePromise: <T>(message: Record<string, unknown>) => Promise<T>,
  entityId: string,
): Promise<TodoItem[]> {
  const result = await sendMessagePromise<TodoItemsResult>({
    type: "todo/item/list",
    entity_id: entityId,
  });
  return normalizeTodoItems(result);
}

/** Live subscription to a to-do list. Resolves to an unsubscribe function. */
export function subscribeTodoItems(
  subscribeMessage: <T>(
    message: Record<string, unknown>,
    onMessage: (result: T) => void,
  ) => Promise<() => void>,
  entityId: string,
  onItems: (items: TodoItem[]) => void,
): Promise<() => void> {
  return subscribeMessage<TodoItemsResult>(
    { type: "todo/item/subscribe", entity_id: entityId },
    (result) => {
      onItems(normalizeTodoItems(result));
    },
  );
}

export interface MoveTodoItemOptions {
  entityId: string;
  uid: string;
  /** Item to place this one after. Omit to move to the top of the list. */
  previousUid?: string;
}

export async function moveTodoItem(
  sendMessagePromise: <T>(message: Record<string, unknown>) => Promise<T>,
  options: MoveTodoItemOptions,
): Promise<void> {
  const message: Record<string, unknown> = {
    type: "todo/item/move",
    entity_id: options.entityId,
    uid: options.uid,
  };
  if (options.previousUid != null) {
    message.previous_uid = options.previousUid;
  }
  await sendMessagePromise<unknown>(message);
}
