import Ionicons from "@expo/vector-icons/Ionicons";
import {
  TODO_FEATURE,
  todoSupportsFeature,
  type TodoItem,
} from "@ethio/ha-sdk";
import { Checkbox, Input, Text, TextField } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { withUniwind } from "uniwind";

import { useT } from "@/store/locale-store";
import { useEntity } from "@/store/use-entity";
import { Button } from "@/ui/haptic";
import { useCallService } from "@/widgets/use-service";
import { todoFeatures, useTodoItems } from "@/widgets/use-todo-items";

const Icon = withUniwind(Ionicons);

export function TodoDetailBody({ entityId }: { entityId: string }) {
  const t = useT();
  const entity = useEntity(entityId);
  const { items, loading, error } = useTodoItems(entityId);
  const [draft, setDraft] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);
  const callService = useCallService();

  if (!entity) {
    return <Text className="text-muted">{t("widget.entityMissing")}</Text>;
  }

  const features = todoFeatures(entity);
  const canCreate = todoSupportsFeature(features, TODO_FEATURE.CREATE_TODO_ITEM);
  const canUpdate = todoSupportsFeature(features, TODO_FEATURE.UPDATE_TODO_ITEM);
  const canDelete = todoSupportsFeature(features, TODO_FEATURE.DELETE_TODO_ITEM);
  const incomplete = items.filter((item) => item.status === "needs_action");
  const completed = items.filter((item) => item.status === "completed");
  const summary = draft.trim();

  const run = (service: string, data: Record<string, unknown>) => {
    callService("todo", service, { entity_id: entityId, ...data });
  };

  const add = () => {
    if (!summary || !canCreate) return;
    run("add_item", { item: summary });
    setDraft("");
  };

  const toggle = (item: TodoItem) => {
    if (!canUpdate) return;
    run("update_item", {
      item: item.uid,
      status: item.status === "completed" ? "needs_action" : "completed",
    });
  };

  const remove = (item: TodoItem) => {
    if (!canDelete) return;
    run("remove_item", { item: item.uid });
  };

  return (
    <View className="gap-5">
      <Text className="text-muted text-sm">
        {incomplete.length === 1
          ? t("widget.todo.openOne")
          : t("widget.todo.open", { count: incomplete.length })}
        {" · "}
        {t("widget.todo.done", { count: completed.length })}
      </Text>

      {canCreate ? (
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <TextField>
              <Input
                value={draft}
                onChangeText={setDraft}
                placeholder={t("widget.todo.addPlaceholder")}
                accessibilityLabel={t("widget.todo.add")}
                returnKeyType="done"
                onSubmitEditing={add}
              />
            </TextField>
          </View>
          <Button
            isIconOnly
            isDisabled={!summary}
            accessibilityLabel={t("widget.todo.add")}
            onPress={add}
          >
            <Icon name="add" size={20} className="text-accent-foreground" />
          </Button>
        </View>
      ) : null}

      {loading && items.length === 0 ? (
        <Text className="text-muted text-sm">{t("widget.todo.loading")}</Text>
      ) : null}
      {error ? <Text className="text-danger text-sm">{error}</Text> : null}

      <TodoRows
        items={incomplete}
        emptyLabel={t("widget.todo.nothingOpen")}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onToggle={toggle}
        onRemove={remove}
      />

      {completed.length > 0 ? (
        <View className="gap-3">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setShowCompleted((prev) => !prev)}
          >
            <Button.Label>
              {showCompleted
                ? t("widget.todo.hideCompleted", { count: completed.length })
                : t("widget.todo.showCompleted", { count: completed.length })}
            </Button.Label>
          </Button>
          {showCompleted ? (
            <TodoRows
              items={completed}
              emptyLabel=""
              canUpdate={canUpdate}
              canDelete={canDelete}
              onToggle={toggle}
              onRemove={remove}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function TodoRows({
  items,
  emptyLabel,
  canUpdate,
  canDelete,
  onToggle,
  onRemove,
}: {
  items: TodoItem[];
  emptyLabel: string;
  canUpdate: boolean;
  canDelete: boolean;
  onToggle: (item: TodoItem) => void;
  onRemove: (item: TodoItem) => void;
}) {
  const t = useT();
  if (items.length === 0) {
    return emptyLabel ? (
      <Text className="text-muted text-sm">{emptyLabel}</Text>
    ) : null;
  }

  return (
    <View className="gap-3">
      {items.map((item) => {
        const done = item.status === "completed";
        return (
          <View key={item.uid} className="flex-row items-start gap-2">
            <Checkbox
              className="mt-0.5"
              isSelected={done}
              isDisabled={!canUpdate}
              onSelectedChange={() => onToggle(item)}
              accessibilityLabel={
                done ? t("widget.todo.incomplete") : t("widget.todo.complete")
              }
            />
            <View className="min-w-0 flex-1">
              <Text
                className={
                  done
                    ? "text-muted text-sm line-through"
                    : "text-foreground text-sm font-medium"
                }
              >
                {item.summary}
              </Text>
              {item.due ? (
                <Text className="text-muted mt-0.5 text-xs">
                  {t("widget.todo.due", { date: item.due })}
                </Text>
              ) : null}
            </View>
            {canDelete ? (
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                accessibilityLabel={t("widget.todo.delete")}
                onPress={() => onRemove(item)}
              >
                <Icon name="trash-outline" size={18} className="text-muted" />
              </Button>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
