import { Chip, Spinner } from "heroui-native";

import { needsLogin } from "@/lib/connection-error";
import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";

export function ConnectionStatusChip() {
  const t = useT();
  const status = useHaStore((state) => state.status);
  const mode = useHaStore((state) => state.mode);
  const failure = useHaStore((state) => state.failure);
  const connect = useHaStore((state) => state.connect);

  if (mode !== "live") return null;

  if (status === "reconnecting" || status === "connecting") {
    return (
      <Chip size="sm" color="warning" variant="soft" className="self-start">
        <Spinner size="sm" />
        <Chip.Label>{t("status.reconnecting")}</Chip.Label>
      </Chip>
    );
  }

  if (status !== "error") return null;

  if (needsLogin(failure)) {
    return (
      <Chip size="sm" color="danger" variant="soft" className="self-start">
        {t("status.offline")}
      </Chip>
    );
  }

  return (
    <Chip
      size="sm"
      color="danger"
      variant="soft"
      className="self-start"
      accessibilityLabel={t("status.retry")}
      onPress={() => {
        void connect();
      }}
    >
      {`${t("status.offline")} · ${t("status.retry")}`}
    </Chip>
  );
}
