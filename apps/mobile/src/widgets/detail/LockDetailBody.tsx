import Ionicons from "@expo/vector-icons/Ionicons";
import { deriveLock } from "@ethio/ha-sdk";
import { Input, Label, Surface, Text, TextField } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { withUniwind } from "uniwind";

import type { MessageKey } from "@/i18n";
import { useT } from "@/store/locale-store";
import { useEntity } from "@/store/use-entity";
import { Button } from "@/ui/haptic";
import { EntityDetailBody } from "@/widgets/EntityDetailBody";
import { useOptimistic } from "@/widgets/use-optimistic";
import { useCallService } from "@/widgets/use-service";

const Icon = withUniwind(Ionicons);

const STATUS_KEYS: Record<string, MessageKey> = {
  locked: "widget.state.locked",
  unlocked: "widget.state.unlocked",
  locking: "widget.state.locking",
  unlocking: "widget.state.unlocking",
  jammed: "widget.state.jammed",
  open: "widget.state.open",
};

function codeFormat(
  entity: { attributes: Record<string, unknown> } | undefined,
): "number" | "text" | null {
  const format = entity?.attributes.code_format;
  return format === "number" || format === "text" ? format : null;
}

export function LockDetailBody({ entityId }: { entityId: string }) {
  const t = useT();
  const entity = useEntity(entityId);
  const lock = deriveLock(entity);
  const callService = useCallService();
  const [state, setOptimisticState] = useOptimistic(entity?.state ?? "unknown");
  const [code, setCode] = useState("");
  const format = codeFormat(entity);
  const busy = state === "locking" || state === "unlocking";
  const statusKey = STATUS_KEYS[state];

  if (!entity || !lock) {
    return <Text className="text-muted">{t("widget.entityMissing")}</Text>;
  }

  const run = (service: "lock" | "unlock" | "open") => {
    if (busy) return;
    const pin = code.trim();
    setOptimisticState(
      service === "lock" ? "locking" : service === "unlock" ? "unlocking" : "open",
    );
    callService("lock", service, {
      entity_id: entityId,
      ...(pin && service !== "lock" ? { code: pin } : {}),
    });
  };

  return (
    <View className="gap-6">
      <Surface
        variant="secondary"
        className="rounded-inner items-center gap-3 p-6"
      >
        <Icon
          name={
            lock.isJammed
              ? "warning-outline"
              : state === "locked" || state === "locking"
                ? "lock-closed"
                : "lock-open-outline"
          }
          size={64}
          className={
            lock.isJammed
              ? "text-danger"
              : state === "locked" || state === "locking"
                ? "text-accent"
                : "text-muted"
          }
        />
        <Text className="text-foreground text-xl font-semibold">
          {statusKey ? t(statusKey) : state}
        </Text>
      </Surface>

      {format ? (
        <View className="gap-2">
          <Label>{t("widget.lock.code")}</Label>
          <TextField>
            <Input
              value={code}
              onChangeText={setCode}
              placeholder={t("widget.lock.codePlaceholder")}
              accessibilityLabel={t("widget.lock.code")}
              keyboardType={format === "number" ? "number-pad" : "default"}
              secureTextEntry
            />
          </TextField>
        </View>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          isDisabled={busy}
          onPress={() => run("lock")}
        >
          {t("widget.action.lock")}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          isDisabled={busy}
          onPress={() => run("unlock")}
        >
          {t("widget.action.unlock")}
        </Button>
        {lock.supportsOpen ? (
          <Button
            size="sm"
            variant="secondary"
            isDisabled={busy}
            onPress={() => run("open")}
          >
            {t("widget.action.open")}
          </Button>
        ) : null}
      </View>

      <EntityDetailBody entityId={entityId} />
    </View>
  );
}
