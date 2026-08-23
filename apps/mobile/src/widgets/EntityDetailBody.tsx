import { Surface, Text } from "heroui-native";
import { View } from "react-native";

import { toIntlLocale } from "@/i18n";
import { useLocaleStore, useT } from "@/store/locale-store";
import { useEntity } from "@/store/use-entity";

/** Shown as the tile title already, or too noisy to be worth a row. */
const HIDDEN_ATTRIBUTES = new Set([
  "friendly_name",
  "icon",
  "entity_picture",
  "access_token",
  "supported_features",
  "supported_color_modes",
]);

function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value || "—";
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  return JSON.stringify(value);
}

function humanize(key: string): string {
  return key
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4 px-4 py-3">
      <Text className="text-muted flex-shrink-0 text-sm">{label}</Text>
      <Text className="text-foreground flex-1 text-right text-sm">{value}</Text>
    </View>
  );
}

/** Fallback detail view: raw state plus every attribute worth reading. */
export function EntityDetailBody({ entityId }: { entityId: string }) {
  const t = useT();
  const locale = useLocaleStore((state) => state.locale);
  const entity = useEntity(entityId);

  if (!entity) {
    return <Text className="text-muted">{t("widget.entityMissing")}</Text>;
  }

  const attributes = Object.entries(entity.attributes)
    .filter(([key]) => !HIDDEN_ATTRIBUTES.has(key))
    .sort(([a], [b]) => a.localeCompare(b));

  const changed = entity.last_changed
    ? new Date(entity.last_changed).toLocaleString(toIntlLocale(locale))
    : null;

  return (
    <View className="gap-4">
      <Surface variant="secondary" className="rounded-inner overflow-hidden">
        <Row label={t("widget.detail.state")} value={entity.state} />
        <Row label={t("widget.detail.entityId")} value={entity.entity_id} />
        {changed ? (
          <Row label={t("widget.detail.lastChanged")} value={changed} />
        ) : null}
      </Surface>

      {attributes.length ? (
        <View className="gap-2">
          <Text className="text-muted px-1 text-sm font-medium">
            {t("widget.detail.attributes")}
          </Text>
          <Surface variant="secondary" className="rounded-inner overflow-hidden">
            {attributes.map(([key, value]) => (
              <Row key={key} label={humanize(key)} value={formatValue(value)} />
            ))}
          </Surface>
        </View>
      ) : null}
    </View>
  );
}
