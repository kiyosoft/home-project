import {
  deriveTeamTracker,
  hexToRgb,
  rgbaCss,
  type TeamTrackerView,
} from "@ethio/ha-sdk";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "heroui-native";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { useT } from "@/store/locale-store";
import { GlassSurface } from "@/ui/GlassSurface";
import { PressableFeedback } from "@/ui/haptic";
import { TeamTrackerDetailBody } from "@/widgets/detail/TeamTrackerDetailBody";
import { TeamCrest } from "@/widgets/team/TeamCrest";
import { TeamMatchup } from "@/widgets/team/TeamMatchup";
import { readString, type WidgetBodyProps } from "@/widgets/types";
import { useCallService } from "@/widgets/use-service";
import { useTile } from "@/widgets/use-tile";

function headerTitle(view: TeamTrackerView, custom: string, fallback: string) {
  if (custom) return custom;
  if (view.league) return view.league;
  if (view.sport) return view.sport.toUpperCase();
  return fallback;
}

function statusLine(view: TeamTrackerView, t: ReturnType<typeof useT>): string {
  switch (view.state) {
    case "PRE":
      return view.kickoff ?? view.date ?? t("widget.team.upcoming");
    case "IN":
      return view.inGameClock;
    case "POST":
      return t("widget.team.final");
    case "BYE":
      return t("widget.team.bye");
    case "NOT_FOUND":
      return view.apiMessage ?? t("widget.team.notFound");
    default:
      return view.rawState;
  }
}

function StateBadge({ view }: { view: TeamTrackerView }) {
  const live = view.state === "IN";
  const done = view.state === "POST";
  return (
    <View
      className={`flex-row items-center gap-1.5 rounded-md px-2 py-0.5 ${
        live ? "bg-danger/15" : done ? "bg-accent/15" : "bg-surface-tertiary"
      }`}
    >
      {live ? <View className="bg-danger size-1.5 rounded-full" /> : null}
      <Text
        className={`text-[10px] font-semibold uppercase tracking-wide ${
          live ? "text-danger" : done ? "text-accent" : "text-muted"
        }`}
      >
        {view.rawState}
      </Text>
    </View>
  );
}

export function TeamTrackerTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const callService = useCallService();
  const { entityId, entity, unavailable, sheet } = useTile(config);
  const view = deriveTeamTracker(entity);
  const homeOnRight = readString(config, "home_side") === "right";
  const showRank = config.show_rank !== false;
  const showLastPlay = config.show_last_play !== false;
  const compact = size === "sm";

  useEffect(() => {
    if (!entityId || view?.state !== "IN") return;
    const refresh = () => {
      callService("homeassistant", "update_entity", { entity_id: entityId });
    };
    refresh();
    const timer = setInterval(refresh, 10_000);
    return () => clearInterval(timer);
  }, [callService, entityId, view?.state]);

  const customTitle = readString(config, "title").trim();
  const title = view
    ? headerTitle(view, customTitle, t("widget.team.title"))
    : customTitle || t("widget.team.title");

  const openDetail = () => {
    if (!view) return;
    sheet.open({
      title,
      description: statusLine(view, t),
      body: <TeamTrackerDetailBody entityId={view.entityId} />,
    });
  };

  const showScore = view?.state === "IN" || view?.state === "POST";
  const left = homeOnRight ? view?.opponent : view?.team;
  const right = homeOnRight ? view?.team : view?.opponent;
  const teamWinning =
    view?.state === "POST" &&
    view.team.score != null &&
    view.opponent.score != null &&
    view.team.score > view.opponent.score;
  const oppWinning =
    view?.state === "POST" &&
    view.team.score != null &&
    view.opponent.score != null &&
    view.opponent.score > view.team.score;

  const leftRgb = hexToRgb(left?.colors[0] ?? "");
  const rightRgb = hexToRgb(right?.colors[0] ?? "");
  const wash: [string, string, ...string[]] | null =
    leftRgb && rightRgb
      ? [rgbaCss(leftRgb, 0.2), "transparent", rgbaCss(rightRgb, 0.2)]
      : leftRgb
        ? [rgbaCss(leftRgb, 0.18), "transparent"]
        : rightRgb
          ? ["transparent", rgbaCss(rightRgb, 0.18)]
          : null;

  return (
    <PressableFeedback
      onPress={openDetail}
      onLongPress={openDetail}
      isDisabled={unavailable || !view}
      accessibilityLabel={
        view ? `${title}, ${statusLine(view, t)}` : title
      }
      className="flex-1"
    >
      <GlassSurface
        level="tile"
        interactive
        className="flex-1 overflow-hidden p-4"
        style={{ minHeight: compact ? 168 : 196 }}
      >
        {wash ? (
          <LinearGradient
            colors={wash}
            start={{ x: 0, y: 0.45 }}
            end={{ x: 1, y: 0.55 }}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        <View className={`flex-1 ${unavailable ? "opacity-50" : ""}`}>
          <View className="mb-3 flex-row items-center justify-between gap-2">
            <Text
              numberOfLines={1}
              className="text-muted flex-1 text-xs font-medium uppercase tracking-[1.6px]"
            >
              {title}
            </Text>
            {view && !unavailable ? <StateBadge view={view} /> : null}
          </View>

          {!view || unavailable ? (
            <View className="flex-1 justify-center">
              <Text className="text-muted text-sm">
                {t("widget.state.unavailable")}
              </Text>
            </View>
          ) : view.state === "NOT_FOUND" ? (
            <View className="flex-1 items-center justify-center gap-1">
              <Text className="text-foreground text-lg font-semibold">
                {t("widget.team.notFound")}
              </Text>
              {view.apiMessage ? (
                <Text className="text-muted text-center text-sm">
                  {view.apiMessage}
                </Text>
              ) : null}
            </View>
          ) : view.state === "BYE" ? (
            <View className="flex-1 items-center justify-center gap-3">
              <TeamCrest side={view.team} size={compact ? 40 : 56} />
              <Text className="text-muted text-sm">{t("widget.team.bye")}</Text>
            </View>
          ) : left && right ? (
            <>
              <TeamMatchup
                left={left}
                right={right}
                state={view.state}
                showScore={Boolean(showScore)}
                showRank={showRank}
                showNames={!compact}
                crestSize={compact ? 40 : 56}
                leagueLogo={!compact ? view.leagueLogo : undefined}
                leftWinning={
                  Boolean(teamWinning && !homeOnRight) ||
                  Boolean(oppWinning && homeOnRight)
                }
                rightWinning={
                  Boolean(teamWinning && homeOnRight) ||
                  Boolean(oppWinning && !homeOnRight)
                }
              />
              <View className="border-border/70 mt-3 min-w-0 border-t pt-2">
                <Text className="text-foreground text-center text-sm font-medium tabular-nums">
                  {statusLine(view, t)}
                </Text>
                {showLastPlay && view.lastPlay && view.state === "IN" && !compact ? (
                  <Text
                    numberOfLines={1}
                    className="text-muted mt-0.5 text-center text-xs"
                  >
                    {view.lastPlay}
                  </Text>
                ) : view.venue && view.state === "PRE" ? (
                  <Text
                    numberOfLines={1}
                    className="text-muted mt-0.5 text-center text-xs"
                  >
                    {view.venue}
                  </Text>
                ) : null}
              </View>
            </>
          ) : null}
        </View>
      </GlassSurface>
    </PressableFeedback>
  );
}
