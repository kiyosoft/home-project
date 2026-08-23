import { deriveTeamTracker } from "@ethio/ha-sdk";
import { Label, Separator, Surface, Text } from "heroui-native";
import { View } from "react-native";

import { useT } from "@/store/locale-store";
import { useEntity } from "@/store/use-entity";
import { TeamCrest } from "@/widgets/team/TeamCrest";
import { TeamMatchup } from "@/widgets/team/TeamMatchup";

function Fact({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View className="flex-row items-start justify-between gap-4 px-4 py-3">
      <Text className="text-muted shrink-0 text-sm">{label}</Text>
      <Text className="text-foreground flex-1 text-right text-sm">{value}</Text>
    </View>
  );
}

export function TeamTrackerDetailBody({ entityId }: { entityId: string }) {
  const t = useT();
  const entity = useEntity(entityId);
  const view = deriveTeamTracker(entity);

  if (!view) {
    return <Text className="text-muted">{t("widget.entityMissing")}</Text>;
  }

  const showScore = view.state === "IN" || view.state === "POST";
  const teamWinning =
    view.state === "POST" &&
    view.team.score != null &&
    view.opponent.score != null &&
    view.team.score > view.opponent.score;
  const oppWinning =
    view.state === "POST" &&
    view.team.score != null &&
    view.opponent.score != null &&
    view.opponent.score > view.team.score;

  const status =
    view.state === "PRE"
      ? (view.kickoff ?? view.date ?? t("widget.team.upcoming"))
      : view.state === "IN"
        ? view.inGameClock
        : view.state === "POST"
          ? t("widget.team.final")
          : view.state === "BYE"
            ? t("widget.team.bye")
            : (view.apiMessage ?? t("widget.team.notFound"));

  return (
    <View className="gap-5">
      {view.state === "NOT_FOUND" ? (
        <Text className="text-muted">
          {view.apiMessage ?? t("widget.team.notFound")}
        </Text>
      ) : view.state === "BYE" ? (
        <View className="items-center gap-3 py-4">
          <TeamCrest side={view.team} size={72} />
          <Text className="text-foreground text-xl font-semibold">
            {view.team.name ?? view.team.abbr ?? "—"}
          </Text>
          <Text className="text-muted">{t("widget.team.bye")}</Text>
        </View>
      ) : (
        <View className="min-h-48">
          <TeamMatchup
            left={view.team}
            right={view.opponent}
            state={view.state}
            showScore={showScore}
            showRank
            showNames
            crestSize={64}
            leagueLogo={view.leagueLogo}
            leftWinning={teamWinning}
            rightWinning={oppWinning}
          />
          <Text className="text-foreground mt-4 text-center text-base font-medium tabular-nums">
            {status}
          </Text>
        </View>
      )}

      {view.lastPlay && view.state === "IN" ? (
        <View className="gap-2">
          <Label>{t("widget.team.lastPlay")}</Label>
          <Surface variant="secondary" className="rounded-inner p-4">
            <Text className="text-foreground text-base leading-6">
              {view.lastPlay}
            </Text>
          </Surface>
        </View>
      ) : null}

      <View className="gap-2">
        <Separator />
        <Surface variant="secondary" className="rounded-inner overflow-hidden">
          <Fact label={t("widget.team.clock")} value={status} />
          <Fact label={t("widget.team.venue")} value={view.venue} />
          <Fact label={t("widget.team.kickoff")} value={view.kickoff} />
          <Fact label={t("widget.team.league")} value={view.league} />
        </Surface>
      </View>
    </View>
  );
}
