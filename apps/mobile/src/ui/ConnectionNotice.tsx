import { router } from "expo-router";
import { Button, Card, Spinner, Text } from "heroui-native";
import { View } from "react-native";

import { failureMessageKey } from "@/lib/connection-error";
import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";

/**
 * Stands in for the dashboard until a cold start lands, in place of the sign-in
 * form the app used to fall back to. Nothing here asks for credentials: the
 * session is already good, only the hub is out of reach.
 */
export function ConnectionNotice() {
  const t = useT();
  const status = useHaStore((state) => state.status);
  const failure = useHaStore((state) => state.failure);
  const connect = useHaStore((state) => state.connect);

  if (status !== "error") {
    return (
      <View className="flex-1 items-center justify-center gap-3">
        <Spinner />
        <Text className="text-muted">{t("status.connecting")}</Text>
      </View>
    );
  }

  const noAddress = failure?.kind === "no-address";

  return (
    <View className="pt-6">
      <Card>
        <Card.Body className="gap-3">
          <Card.Title>
            {t(noAddress ? "status.setUpAddress" : "status.offlineTitle")}
          </Card.Title>
          {failure ? (
            <Card.Description>{t(failureMessageKey(failure))}</Card.Description>
          ) : null}
          {noAddress ? null : (
            <Card.Description>{t("status.offlineBody")}</Card.Description>
          )}
        </Card.Body>
        <Card.Footer className="flex-row flex-wrap gap-2">
          {noAddress ? null : (
            <Button size="sm" onPress={() => void connect()}>
              {t("status.retry")}
            </Button>
          )}
          <Button
            size="sm"
            variant={noAddress ? "primary" : "secondary"}
            onPress={() => router.push("/connection")}
          >
            {t("connection.openSettings")}
          </Button>
        </Card.Footer>
      </Card>
    </View>
  );
}
