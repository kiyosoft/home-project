import {
  subscribeTodoItems,
  type HassEntity,
  type TodoItem,
} from "@ethio/ha-sdk";
import { useEffect, useState } from "react";

import { hasSession, useHaStore } from "@/store/ha-store";

export interface TodoItemsState {
  items: TodoItem[];
  loading: boolean;
  error: string | null;
}

export function todoFeatures(entity: HassEntity | undefined): number {
  const value = entity?.attributes.supported_features;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Live to-do items for an entity via todo/item/subscribe. */
export function useTodoItems(entityId: string): TodoItemsState {
  const status = useHaStore((state) => state.status);
  const subscribeMessage = useHaStore((state) => state.subscribeMessage);
  const [items, setItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(Boolean(entityId));
  const [error, setError] = useState<string | null>(null);
  const session = hasSession(status);

  useEffect(() => {
    if (!entityId || !session) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    setLoading(true);
    setError(null);

    void subscribeTodoItems(subscribeMessage, entityId, (next) => {
      if (cancelled) return;
      setItems(next);
      setLoading(false);
      setError(null);
    })
      .then((dispose) => {
        if (cancelled) {
          dispose();
          return;
        }
        unsubscribe = dispose;
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setItems([]);
        setLoading(false);
        setError(err instanceof Error ? err.message : "Failed to load to-do");
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [entityId, session, subscribeMessage]);

  return { items, loading, error };
}
