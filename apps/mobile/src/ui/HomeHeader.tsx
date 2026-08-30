import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, Chip, Text, useThemeColor } from "heroui-native";
import { ScrollView, View } from "react-native";

import { useHomeSummary, type HomeSummary } from "@/dashboard/home-summary";
import type { MessageKey, TranslateParams } from "@/i18n";
import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { isActiveState } from "@/store/use-entity";
import { ConnectionStatusChip } from "@/ui/ConnectionStatusChip";

type Translate = (key: MessageKey, params?: TranslateParams) => string;

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

/**
 * The one-line answer to "what is the house doing". Parts drop out when they
 * have nothing to say, so a home with no locks never reads "0 unlocked".
 */
function summaryLine(summary: HomeSummary, t: Translate): string {
  const parts: string[] = [];

  if (summary.lightsOn === 1) parts.push(t("home.summaryLightOne"));
  else if (summary.lightsOn > 1)
    parts.push(t("home.summaryLights", { count: summary.lightsOn }));
  else parts.push(t("home.summaryLightsOff"));

  if (summary.temperature !== null) {
    parts.push(`${summary.temperature}${summary.temperatureUnit}`);
  }

  if (summary.unlocked === 1) parts.push(t("home.summaryUnlockedOne"));
  else if (summary.unlocked > 1)
    parts.push(t("home.summaryUnlocked", { count: summary.unlocked }));
  else if (summary.lockCount > 0) parts.push(t("home.summaryLocked"));

  if (summary.playing === 1) parts.push(t("home.summaryPlayingOne"));
  else if (summary.playing > 1)
    parts.push(t("home.summaryPlaying", { count: summary.playing }));

  return parts.join(" · ");
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
 * The Home screen's masthead. Apple Home and Google Home both open with what
 * the house is doing rather than with the grid; this is that, plus shortcuts
 * into the sections below.
 */
export function HomeHeader({
  sections,
  onJumpToSection,
  editing,
  onToggleEditing,
}: HomeHeaderProps) {
  const t = useT();
  const mode = useHaStore((state) => state.mode);
  const summary = useHomeSummary();
  const foreground = useThemeColor("foreground");
  const accentForeground = useThemeColor("accent-foreground");

  // A greeting wants what people call you, not your registered full name.
  const name = useHaStore((state) => state.userName).split(" ")[0] ?? "";
  const greeting = t(greetingKey(new Date().getHours()));
  const editLabel = t(editing ? "home.done" : "home.edit");

  return (
    <View className="gap-3">
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
            // No one to address, so the greeting carries the line itself
            // rather than leaving a gap where a name would sit.
            <Text.Heading type="h1" numberOfLines={1}>
              {greeting}
            </Text.Heading>
          )}
        </View>
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

      <Text className="text-muted text-[15px]">{summaryLine(summary, t)}</Text>

      {mode === "demo" ? (
        <Chip size="sm" color="success" variant="soft" className="self-start">
          {t("home.demoBadge")}
        </Chip>
      ) : (
        <ConnectionStatusChip />
      )}

      {sections.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          // The row bleeds into the screen's padding so chips can scroll to
          // the very edge instead of stopping short of it.
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
