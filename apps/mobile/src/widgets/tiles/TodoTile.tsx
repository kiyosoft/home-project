import {
  TODO_FEATURE,
  todoSupportsFeature,
  type TodoItem,
} from "@ethio/ha-sdk";
import { Checkbox, Text } from "heroui-native";
import { View } from "react-native";

import { useT } from "@/store/locale-store";
import { GlassSurface } from "@/ui/GlassSurface";
import { PressableFeedback } from "@/ui/haptic";
import { TodoDetailBody } from "@/widgets/detail/TodoDetailBody";
import { useTileMinHeight } from "@/widgets/tile-metrics";
import type { WidgetBodyProps } from "@/widgets/types";
import { useCallService } from "@/widgets/use-service";
import { todoFeatures, useTodoItems } from "@/widgets/use-todo-items";
import { useTile } from "@/widgets/use-tile";

const PREVIEW = 5;

export function TodoTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const callService = useCallService();
  const { entityId, entity, title, unavailable, sheet } = useTile(config);
  const { items, loading } = useTodoItems(entityId);
  const minHeight = useTileMinHeight(size);
  const compact = size === "sm";

  const openDetail = () => {
    if (!entityId) return;
    sheet.open({
      title,
      body: <TodoDetailBody entityId={entityId} />,
    });
  };

  if (!entityId || unavailable) {
    return (
      <GlassSurface level="tile" className="flex-1 p-4" style={{ minHeight }}>
        <Text className="text-foreground text-base font-semibold">
          {title || t("widget.todo.title")}
        </Text>
        <Text className="text-muted mt-2 text-sm">
          {entityId
            ? t("widget.state.unavailable")
            : t("widget.todo.pick")}
        </Text>
      </GlassSurface>
    );
  }

  const canUpdate = todoSupportsFeature(
    todoFeatures(entity),
    TODO_FEATURE.UPDATE_TODO_ITEM,
  );
  const incomplete = items.filter((item) => item.status === "needs_action");
  const preview = compact ? [] : incomplete.slice(0, PREVIEW);
  const stateCount = Number(entity?.state);
  const count =
    entity?.state !== "" && Number.isFinite(stateCount)
      ? stateCount
      : incomplete.length;
  const status =
    loading && items.length === 0
      ? t("widget.todo.loading")
      : count <= 0
        ? t("widget.todo.caughtUp")
        : count === 1
          ? t("widget.todo.openOne")
          : t("widget.todo.open", { count });

  const toggle = (item: TodoItem) => {
    if (!canUpdate) return;
    callService("todo", "update_item", {
      entity_id: entityId,
      item: item.uid,
      status: item.status === "completed" ? "needs_action" : "completed",
    });
  };

  return (
    <PressableFeedback
      onPress={openDetail}
      onLongPress={openDetail}
      accessibilityLabel={`${title}, ${status}`}
      className="flex-1"
    >
      <GlassSurface
        level="tile"
        interactive
        className="flex-1 p-4"
        style={{ minHeight }}
      >
        <Text className="text-muted text-[11px] font-medium uppercase tracking-[0.14em]">
          {t("widget.todo.title")}
        </Text>
        <Text
          numberOfLines={1}
          className="text-foreground mt-1 text-base font-semibold"
        >
          {title}
        </Text>
        <View className="mt-3 flex-row items-baseline gap-1.5">
          <Text className="text-foreground text-3xl font-semibold">
            {count}
          </Text>
          <Text className="text-muted text-base">
            {t("widget.todo.openWord")}
          </Text>
        </View>
        {preview.length > 0 ? (
          <View className="mt-3 gap-2">
            {preview.map((item) => (
              <View key={item.uid} className="flex-row items-center gap-2">
                <Checkbox
                  isSelected={false}
                  isDisabled={!canUpdate}
                  onSelectedChange={() => toggle(item)}
                  accessibilityLabel={t("widget.todo.complete")}
                />
                <Text
                  numberOfLines={1}
                  className="text-foreground flex-1 text-sm"
                >
                  {item.summary}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-muted mt-3 text-sm">{status}</Text>
        )}
      </GlassSurface>
    </PressableFeedback>
  );
}
