import {
  deriveSinksar,
  sinksarArke,
  sinksarPrimaryIndex,
  sinksarStory,
} from "@ethio/ha-sdk";
import { Label, Separator, Surface, Text } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { useT } from "@/store/locale-store";
import { useEntity } from "@/store/use-entity";
import { Chip } from "@/ui/haptic";

export function SinksarDetailBody({ entityId }: { entityId: string }) {
  const t = useT();
  const entity = useEntity(entityId);
  const view = deriveSinksar(entity);
  const [selected, setSelected] = useState(() =>
    view ? sinksarPrimaryIndex(view) : 0,
  );

  if (!view) {
    return <Text className="text-muted">{t("widget.entityMissing")}</Text>;
  }

  const index =
    view.entries.length === 0
      ? 0
      : Math.max(0, Math.min(selected, view.entries.length - 1));
  const entry = view.entries[index];
  const story = sinksarStory(view, index);
  const arke = sinksarArke(view, index);

  if (!entry) {
    return (
      <Text className="text-muted">{t("widget.sinksar.empty")}</Text>
    );
  }

  return (
    <View className="gap-5">
      {view.entries.length > 1 ? (
        <View className="flex-row flex-wrap gap-2">
          {view.entries.map((item, itemIndex) => {
            const active = itemIndex === index;
            return (
              <Chip
                key={`${item.order ?? "x"}:${item.type ?? ""}:${item.title}`}
                size="sm"
                variant={active ? "primary" : "secondary"}
                onPress={() => setSelected(itemIndex)}
              >
                <Chip.Label numberOfLines={2}>{item.title}</Chip.Label>
              </Chip>
            );
          })}
        </View>
      ) : null}

      <View className="gap-1">
        <Text className="text-foreground text-xl font-semibold leading-snug">
          {entry.title}
        </Text>
        {entry.type ? (
          <Text className="text-muted text-sm">{entry.type}</Text>
        ) : null}
      </View>

      {story ? (
        <View className="gap-2">
          <Label>{t("widget.sinksar.story")}</Label>
          <Surface variant="secondary" className="rounded-inner p-4">
            <Text className="text-foreground text-base leading-7">{story}</Text>
          </Surface>
        </View>
      ) : (
        <Text className="text-muted">{t("widget.sinksar.noStory")}</Text>
      )}

      {arke.length > 0 ? (
        <View className="gap-3">
          <Separator />
          <Label>{t("widget.sinksar.arke")}</Label>
          <View className="gap-3">
            {arke.map((line) => (
              <Surface
                key={line}
                variant="secondary"
                className="rounded-inner p-4"
              >
                <Text className="text-foreground text-base leading-7">
                  {line}
                </Text>
              </Surface>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
