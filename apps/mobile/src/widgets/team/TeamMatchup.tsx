import type { TeamSide, TeamTrackerState } from "@ethio/ha-sdk";
import { Text } from "heroui-native";
import { Image, View } from "react-native";

import { useT } from "@/store/locale-store";
import { TeamCrest } from "@/widgets/team/TeamCrest";

export function TeamMatchup({
  left,
  right,
  state,
  showScore,
  showRank,
  showNames,
  crestSize,
  leagueLogo,
  leftWinning,
  rightWinning,
}: {
  left: TeamSide;
  right: TeamSide;
  state: TeamTrackerState;
  showScore: boolean;
  showRank: boolean;
  showNames: boolean;
  crestSize: number;
  leagueLogo?: string;
  leftWinning?: boolean;
  rightWinning?: boolean;
}) {
  const t = useT();

  return (
    <View className="relative flex-1 flex-row items-center">
      {leagueLogo ? (
        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center opacity-15"
        >
          <Image
            source={{ uri: leagueLogo }}
            resizeMode="contain"
            style={{ width: 112, height: 112 }}
          />
        </View>
      ) : null}
      <TeamColumn
        side={left}
        showScore={showScore}
        showRank={showRank}
        showNames={showNames}
        crestSize={crestSize}
        winning={leftWinning}
      />
      <View className="z-[1] shrink-0 px-1">
        <Text className="text-muted text-lg font-semibold">
          {state === "PRE" ? t("widget.team.vs") : "–"}
        </Text>
      </View>
      <TeamColumn
        side={right}
        showScore={showScore}
        showRank={showRank}
        showNames={showNames}
        crestSize={crestSize}
        winning={rightWinning}
      />
    </View>
  );
}

function TeamColumn({
  side,
  showScore,
  showRank,
  showNames,
  crestSize,
  winning,
}: {
  side: TeamSide;
  showScore: boolean;
  showRank: boolean;
  showNames: boolean;
  crestSize: number;
  winning?: boolean;
}) {
  return (
    <View className="z-[1] min-w-0 flex-1 items-center gap-1.5">
      <TeamCrest side={side} size={crestSize} />
      <View className="items-center">
        {showRank && side.rank != null ? (
          <Text className="text-muted text-[10px]">#{side.rank}</Text>
        ) : null}
        <Text
          numberOfLines={1}
          className="text-foreground text-sm font-semibold tracking-wide"
        >
          {side.abbr ?? side.name ?? "—"}
        </Text>
        {showNames && side.name && side.abbr ? (
          <Text numberOfLines={1} className="text-muted text-[11px]">
            {side.name}
          </Text>
        ) : null}
      </View>
      {showScore && side.score != null ? (
        <Text
          className={`text-3xl font-semibold tabular-nums ${
            winning ? "text-accent" : "text-foreground"
          }`}
        >
          {side.score}
        </Text>
      ) : null}
    </View>
  );
}
