import { router } from "expo-router";
import { Spinner } from "heroui-native";

import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { Chip } from "@/ui/haptic";

export function ConnectionStatusChip() {
  const t = useT();
  const status = useHaStore((state) => state.status);
  const mode = useHaStore((state) => state.mode);
  const failure = useHaStore((state) => state.failure);
  const connect = useHaStore((state) => state.connect);

  if (mode !== "live") return null;

  if (status === "connecting" || status === "reconnecting") {
    return (
      <Chip size="sm" color="warning" variant="soft" className="self-start">
        <Spinner size="sm" />
        <Chip.Label>
          {t(status === "connecting" ? "status.connecting" : "status.reconnecting")}
        </Chip.Label>
      </Chip>
    );
  }

  if (status !== "error") return null;

  if (failure?.kind === "no-address") {
    return (
      <Chip
        size="sm"
        color="danger"
        variant="soft"
        className="self-start"
        onPress={() => router.push("/connection")}
      >
        {t("status.setUpAddress")}
      </Chip>
    );
  }

  // Always actionable: the backoff is already retrying, and a tap just skips
  // the wait rather than being the only thing that would ever try again.
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
