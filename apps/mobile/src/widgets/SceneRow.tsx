import { serviceForSceneEntity } from "@ethio/mobile-schema";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import { ScrollView } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { withUniwind } from "uniwind";

import { useT } from "@/store/locale-store";
import { entityDomain, entityName, useEntity } from "@/store/use-entity";
import { Chip } from "@/ui/haptic";
import { SETTLE_MS } from "@/ui/motion";
import { useCallService } from "@/widgets/use-service";

const Icon = withUniwind(Ionicons);

const DOMAIN_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  scene: "color-wand-outline",
  script: "play-outline",
};

const FLASH_MS = 900;

function ScenePill({
  entityId,
  editing,
  onRemove,
}: {
  entityId: string;
  editing: boolean;
  onRemove: () => void;
}) {
  const t = useT();
  const entity = useEntity(entityId);
  const callService = useCallService();
  const [flashing, setFlashing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const name = entityName(entity, entityId);
  const running = entity?.state === "on";

  const activate = () => {
    const call = serviceForSceneEntity(entityId);
    if (!call) return;
    callService(call.domain, call.service, { entity_id: entityId });
    setFlashing(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlashing(false), FLASH_MS);
  };

  return (
    <Chip
      size="lg"
      variant="soft"
      color={flashing || running ? "accent" : "default"}
      accessibilityLabel={
        editing ? t("home.removeScene") : t("scene.activate", { name })
      }
      onPress={editing ? onRemove : activate}
    >
      <Icon
        name={
          editing
            ? "close"
            : (DOMAIN_ICONS[entityDomain(entityId)] ?? "color-wand-outline")
        }
        size={18}
        className={
          editing
            ? "text-danger"
            : flashing || running
              ? "text-accent"
              : "text-muted"
        }
      />
      <Chip.Label>{flashing ? t("scene.activated") : name}</Chip.Label>
    </Chip>
  );
}

export interface SceneRowProps {
  entityIds: string[];
  editing?: boolean;
  withAdd?: boolean;
  onRemove?: (entityId: string) => void;
  onAdd?: () => void;
}

export function SceneRow({
  entityIds,
  editing = false,
  withAdd = false,
  onRemove,
  onAdd,
}: SceneRowProps) {
  const t = useT();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Matches the section chips: the row bleeds into the screen's padding so
      // pills can scroll to the very edge instead of stopping short of it.
      className="-mx-5"
      contentContainerClassName="gap-2 px-5"
    >
      {entityIds.map((entityId) => (
        <Animated.View
          key={entityId}
          layout={LinearTransition.duration(SETTLE_MS)}
        >
          <ScenePill
            entityId={entityId}
            editing={editing}
            onRemove={() => onRemove?.(entityId)}
          />
        </Animated.View>
      ))}

      {withAdd ? (
        <Chip
          size="lg"
          variant="soft"
          color="default"
          accessibilityLabel={t("home.addScene")}
          onPress={onAdd}
        >
          <Icon name="add" size={18} className="text-accent" />
          <Chip.Label>{t("home.addScene")}</Chip.Label>
        </Chip>
      ) : null}
    </ScrollView>
  );
}
