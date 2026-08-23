import { Card, Chip, Text } from "heroui-native";

import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { Screen } from "@/ui/Screen";

/**
 * Overview placeholder. Proves the socket is live; the tile grid is next.
 */
export function HomeScreen() {
  const t = useT();
  const mode = useHaStore((state) => state.mode);
  const entityCount = useHaStore(
    (state) => Object.keys(state.entities).length,
  );

  return (
    <Screen className="gap-6">
      <Text.Heading type="h1">{t("tabs.home")}</Text.Heading>

      <Card>
        <Card.Body className="gap-3">
          <Card.Title>
            {mode === "demo"
              ? t("home.placeholderDemo")
              : t("home.placeholderTitle")}
          </Card.Title>
          <Card.Description>{t("home.placeholderBody")}</Card.Description>
          <Chip size="sm" color="success" variant="soft">
            {t("home.entityCount", { count: entityCount })}
          </Chip>
        </Card.Body>
      </Card>
    </Screen>
  );
}
