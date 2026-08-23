import { Card, Text } from "heroui-native";

import type { MessageKey } from "@/i18n";
import { useT } from "@/store/locale-store";
import { Screen } from "@/ui/Screen";

export function ComingLaterScreen({
  titleKey,
  bodyKey,
}: {
  titleKey: MessageKey;
  bodyKey: MessageKey;
}) {
  const t = useT();

  return (
    <Screen className="gap-6">
      <Text.Heading type="h1">{t(titleKey)}</Text.Heading>
      <Card>
        <Card.Body>
          <Card.Description>{t(bodyKey)}</Card.Description>
        </Card.Body>
      </Card>
    </Screen>
  );
}
