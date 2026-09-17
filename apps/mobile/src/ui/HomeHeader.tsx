import { countLightsOn } from "@ethio/ha-sdk";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, useThemeColor } from "heroui-native";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";

import { useArrivalWelcome } from "@/dashboard/use-arrival-welcome";
import type { MessageKey } from "@/i18n";
import { isLiveSession, useHaStore, useLiveSession } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { isActiveState } from "@/store/use-entity";
import { ConnectionStatusChip } from "@/ui/ConnectionStatusChip";
import { Button, Chip } from "@/ui/haptic";

export interface HomeSectionChip {
  id: string;
  title: string;
  entityIds: string[];
}

interface HomeHeaderProps {
  sections: HomeSectionChip[];
  onJumpToSection: (sectionId: string) => void;
  editing: boolean;
  onToggleEditing: () => void;
}

function greetingKey(hour: number): MessageKey {
  if (hour < 12) return "home.greetingMorning";
  if (hour < 18) return "home.greetingAfternoon";
  return "home.greetingEvening";
}

function pad(value: number): string {
  return String(value).padStart(2,  "0");
}

function HeaderClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <Text className="text-foreground text-lg font-semibold tabular-nums">
      {pad(now.getHours())}:{pad(now.getMinutes())}
    </Text>
  );
}

function LightsChip() {
  const t = useT();
  const live = useLiveSession();
  const entities = useHaStore((state) => state.entities);
  const count = useMemo(
    () => (live ? countLightsOn(entities) : 0),
    [entities, live],
  );
  if (count <= 0) return null;
  return (
    <Chip
      size="sm"
      color="accent"
      variant="soft"
      accessibilityLabel={t("home.lightsChipAria")}
    >
      {count === 1
        ? t("home.lightsOnOne")
        : t("home.lightsOn", { count })}
    </Chip>
  );
}

/** A section shortcut that lights up while anything under it is on. */
function SectionChip({
  section,
  onPress,
}: {
  section: HomeSectionChip;
  onPress: () => void;
}) {
  const t = useT();
  const active = useHaStore((state) => {
    if (!isLiveSession(state.mode, state.status)) return 0;
    let count = 0;
    for (const entityId of section.entityIds) {
      if (isActiveState(state.entities[entityId])) count += 1;
    }
    return count;
  });

  return (
    <Chip
      size="sm"
      color={active > 0 ? "accent" : "default"}
      variant="soft"
      accessibilityLabel={t("home.jumpToSection", { name: section.title })}
      onPress={onPress}
    >
      {active > 0 ? `${section.title} · ${active}` : section.title}
    </Chip>
  );
}

/**
 * The Home screen's masthead: greeting, clock, and shortcuts into the
 * sections below. Light counts live on the chip and section pills, not here.
 */
export function HomeHeader({
  sections,
  onJumpToSection,
  editing,
  onToggleEditing,
}: HomeHeaderProps) {
  const t = useT();
  const mode = useHaStore((state) => state.mode);
  const foreground = useThemeColor("foreground");
  const accentForeground = useThemeColor("accent-foreground");

  const name = useHaStore((state) => state.userName).split(" ")[0] ?? "";
  const { welcome } = useArrivalWelcome();
  const greeting = t(welcome ? "home.greetingWelcome" : greetingKey(new Date().getHours()));
  const editLabel = t(editing ? "home.done" : "home.edit");

  return (
    <View className="gap-3">
      {mode === "demo" ? (
        <Chip size="sm" color="success" variant="soft" className="self-start">
          {t("home.demoBadge")}
        </Chip>
      ) : (
        <ConnectionStatusChip errorsOnly />
      )}

      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-0.5">
          {name ? (
            <>
              <Text className="text-muted text-[15px] font-medium">
                {greeting}
              </Text>
              <Text.Heading type="h1" numberOfLines={1}>
                {name}
              </Text.Heading>
            </>
          ) : (
            <Text.Heading type="h1" numberOfLines={1}>
              {greeting}
            </Text.Heading>
          )}
        </View>
        <View className="items-end gap-2">
          <HeaderClock />
          <View className="flex-row items-center gap-2">
            <LightsChip />
            <Button
              size="sm"
              isIconOnly
              variant={editing ? "primary" : "secondary"}
              accessibilityLabel={editLabel}
              onPress={onToggleEditing}
            >
              <Ionicons
                name={editing ? "checkmark" : "pencil"}
                size={18}
                color={editing ? accentForeground : foreground}
              />
            </Button>
          </View>
        </View>
      </View>

      {sections.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-5"
          contentContainerClassName="gap-2 px-5"
        >
          {sections.map((section) => (
            <SectionChip
              key={section.id}
              section={section}
              onPress={() => onJumpToSection(section.id)}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
