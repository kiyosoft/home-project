import { deriveSinksar } from "@ethio/ha-sdk";
import { Text } from "heroui-native";
import { View } from "react-native";

import { useT } from "@/store/locale-store";
import { Chip } from "@/ui/haptic";
import { SinksarDetailBody } from "@/widgets/detail/SinksarDetailBody";
import { readString, type WidgetBodyProps } from "@/widgets/types";
import { useTile } from "@/widgets/use-tile";
import { WidgetTile } from "@/widgets/WidgetTile";

export function SinksarTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const { entity, unavailable, sheet } = useTile(config);
  const view = deriveSinksar(entity);

  const label = readString(config, "title").trim() || t("widget.sinksar.title");
  const primary = view?.primaryTitle;
  const extras = view
    ? view.entries.filter((entry) => entry.title !== primary).slice(0, 3)
    : [];
  const primaryType = view?.entries.find(
    (entry) => entry.title === primary,
  )?.type;

  const openDetail = () => {
    if (!view) return;
    sheet.open({
      title: t("widget.sinksar.title"),
      description: view.dateLabel ?? primary,
      body: <SinksarDetailBody entityId={view.entityId} />,
    });
  };

  return (
    <WidgetTile
      title={label}
      status={unavailable ? t("widget.state.unavailable") : primaryType}
      icon="book-outline"
      size={size}
      disabled={unavailable}
      onPress={openDetail}
      onLongPress={openDetail}
      accessory={
        view?.dateLabel && !unavailable ? (
          <Chip
            size="sm"
            variant="soft"
            color="default"
            pointerEvents="none"
          >
            {view.dateLabel}
          </Chip>
        ) : null
      }
    >
      <View className="gap-1.5">
        <Text
          numberOfLines={size === "md" ? 3 : 2}
          className="text-foreground text-xl font-semibold leading-snug"
        >
          {unavailable ? "—" : (primary ?? "—")}
        </Text>
        {size === "md" && extras.length > 0 && !unavailable
          ? extras.map((entry) => (
              <Text
                key={`${entry.order ?? ""}-${entry.title}`}
                numberOfLines={1}
                className="text-muted text-sm"
              >
                {entry.title}
              </Text>
            ))
          : null}
      </View>
    </WidgetTile>
  );
}
