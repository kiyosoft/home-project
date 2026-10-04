import { useEffect, useState } from "react";
import { z } from "zod";

import {
  defineWidget,
  deriveTeamTracker,
  useCallService,
  useEntity,
  useEntityDetail,
  type TeamSide as TeamSideData,
  type TeamTrackerView,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

import { LastPlayMarquee } from "./LastPlayMarquee";
import { TeamScoreCelebrationHost } from "./ScoreCelebration";

export const teamCardConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
  card_title: z.string().optional(),
  home_side: z.enum(["left", "right"]).default("left"),
  show_league: z.boolean().default(false),
  show_league_logo: z.boolean().default(false),
  show_rank: z.boolean().default(true),
  show_last_play: z.boolean().default(true),
  outline: z.boolean().default(false),
  score_celebration: z.boolean().default(false),
  opponent_celebration: z.boolean().default(false),
  celebration_sound: z.boolean().default(false),
});

function withAlpha(color: string, alpha: number): string {
  const hex = color.startsWith("#") ? color.slice(1) : color;
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    const r = Number.parseInt(hex[0]! + hex[0]!, 16);
    const g = Number.parseInt(hex[1]! + hex[1]!, 16);
    const b = Number.parseInt(hex[2]! + hex[2]!, 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

function teamGradient(leftColor?: string, rightColor?: string): string | undefined {
  if (leftColor && rightColor) {
    return `linear-gradient(105deg, ${withAlpha(leftColor, 0.22)} 0%, ${withAlpha(leftColor, 0.06)} 38%, transparent 50%, ${withAlpha(rightColor, 0.06)} 62%, ${withAlpha(rightColor, 0.22)} 100%)`;
  }
  if (leftColor) {
    return `linear-gradient(135deg, ${withAlpha(leftColor, 0.2)} 0%, transparent 70%)`;
  }
  if (rightColor) {
    return `linear-gradient(225deg, ${withAlpha(rightColor, 0.2)} 0%, transparent 70%)`;
  }
  return undefined;
}

function placeLine(view: TeamTrackerView): string | undefined {
  if (view.venue && view.location) return `${view.venue} · ${view.location}`;
  return view.venue ?? view.location;
}

function homeAwayLabel(side: TeamSideData): string | undefined {
  if (side.homeAway === "home") return "Home";
  if (side.homeAway === "away") return "Away";
  return undefined;
}

function TeamSide({
  side,
  showScore,
  showRank,
  outline,
  emphasize,
}: {
  side: TeamSideData;
  showScore: boolean;
  showRank: boolean;
  outline: boolean;
  emphasize?: boolean;
}) {
  const color = side.colors[0];
  const where = homeAwayLabel(side);
  const [logoFailed, setLogoFailed] = useState(false);
  useEffect(() => {
    setLogoFailed(false);
  }, [side.logo]);
  return (
    <div className="relative z-[1] flex min-w-0 flex-1 flex-col items-center gap-2">
      <div
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-background/70 backdrop-blur-[2px]"
        style={
          outline && color
            ? { boxShadow: `0 0 0 2px ${color}` }
            : undefined
        }
      >
        {side.logo && !logoFailed ? (
          <img
            src={side.logo}
            alt={side.abbr ?? side.name ?? "team"}
            referrerPolicy="no-referrer"
            className="h-12 w-12 object-contain"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="font-display text-lg font-semibold">
            {side.abbr ?? "?"}
          </span>
        )}
      </div>
      <div className="text-center">
        {showRank && side.rank != null ? (
          <p className="text-[10px] text-muted-foreground">#{side.rank}</p>
        ) : null}
        <p className="truncate text-sm font-semibold tracking-wide">
          {side.abbr ?? side.name ?? "—"}
        </p>
        {side.name && side.abbr ? (
          <p className="truncate text-[11px] text-muted-foreground">{side.name}</p>
        ) : null}
        {where ? (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {where}
          </p>
        ) : null}
      </div>
      {showScore && side.score != null ? (
        <p
          className={`font-display text-3xl font-semibold tabular-nums ${
            emphasize ? "text-primary" : ""
          }`}
        >
          {side.score}
        </p>
      ) : !showScore && side.record ? (
        <p className="text-xs font-medium tabular-nums text-muted-foreground">
          {side.record}
        </p>
      ) : null}
    </div>
  );
}

function TeamCard({ config, interactive }: WidgetComponentProps) {
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
  const customTitle = typeof config.title === "string" ? config.title.trim() : "";
  const cardTitle =
    typeof config.card_title === "string" ? config.card_title.trim() : "";
  const entity = useEntity(entityId);
  const entityDetail = useEntityDetail();
  const callService = useCallService();
  const homeSide = config.home_side === "right" ? "right" : "left";
  const showLeague = Boolean(config.show_league);
  const showLeagueLogo = Boolean(config.show_league_logo);
  const showRank = config.show_rank !== false;
  const showLastPlay = config.show_last_play !== false;
  const outline = Boolean(config.outline);
  const scoreCelebration = Boolean(config.score_celebration);
  const opponentCelebration = Boolean(config.opponent_celebration);
  const celebrationSound = Boolean(config.celebration_sound);
  const gameState = entity?.state;

  useEffect(() => {
    if (!entityId || gameState !== "IN") return;
    const refresh = () => {
      void callService("homeassistant", "update_entity", {
        entity_id: entityId,
      }).catch(() => {
        // Demo mode and locked-down tokens have no update_entity.
      });
    };
    refresh();
    const timer = window.setInterval(refresh, 10_000);
    return () => window.clearInterval(timer);
  }, [callService, entityId, gameState]);

  if (!entityId) {
    return (
      <div className="flex h-full min-h-40 flex-col justify-center rounded-2xl border border-border bg-card p-5">
        <p className="font-display text-base font-semibold">
          {customTitle || cardTitle || "Team Card"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Bind a team sensor (sensor.arsenal).
        </p>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="flex h-full min-h-40 flex-col justify-center rounded-2xl border border-dashed border-border bg-card p-5">
        <p className="font-display text-base font-semibold">
          {customTitle || cardTitle || entityId}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Entity unavailable</p>
      </div>
    );
  }

  const view = deriveTeamTracker(entity);
  if (!view) {
    return (
      <div className="flex h-full min-h-40 flex-col justify-center rounded-2xl border border-dashed border-border bg-card p-5">
        <p className="font-display text-base font-semibold">
          {customTitle || cardTitle || entityId}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Entity unavailable</p>
      </div>
    );
  }

  const { state, team, opponent } = view;
  const left = homeSide === "left" ? team : opponent;
  const right = homeSide === "left" ? opponent : team;
  const teamWinning =
    team.score != null &&
    opponent.score != null &&
    team.score > opponent.score;
  const oppWinning =
    team.score != null &&
    opponent.score != null &&
    opponent.score > team.score;

  let statusLine: string = view.rawState;
  if (state === "PRE") {
    statusLine = view.kickoff ?? view.date ?? "Upcoming";
  } else if (state === "IN") {
    statusLine = view.inGameClock;
  } else if (state === "POST") {
    statusLine = "Final";
  } else if (state === "BYE") {
    statusLine = "Bye week";
  } else if (state === "NOT_FOUND") {
    statusLine = view.apiMessage ?? "No game found";
  }

  const title =
    customTitle ||
    cardTitle ||
    (showLeague && view.league
      ? view.league
      : view.sport
        ? view.sport.toUpperCase()
        : "Team Tracker");
  const showScore = state === "IN" || state === "POST";
  const gradient = teamGradient(left.colors[0], right.colors[0]);
  const showCenterLeagueLogo = showLeagueLogo && Boolean(view.leagueLogo);
  const place = placeLine(view);

  return (
    <>
      <TeamScoreCelebrationHost
        celebrateTeam={scoreCelebration}
        celebrateOpponent={opponentCelebration}
        cheerEnabled={celebrationSound}
        teamScore={team.score}
        opponentScore={opponent.score}
        gameState={state}
        teamColors={team.colors}
        opponentColors={opponent.colors}
        teamName={team.name}
        teamAbbr={team.abbr}
        opponentName={opponent.name}
        opponentAbbr={opponent.abbr}
      />
      <div
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={interactive ? () => entityDetail.open(entityId) : undefined}
        onKeyDown={
          interactive
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  entityDetail.open(entityId);
                }
              }
            : undefined
        }
        className={`relative flex h-full min-h-40 flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm outline-none transition-colors ${
          interactive
            ? "cursor-pointer hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
            : ""
        }`}
        style={gradient ? { backgroundImage: gradient } : undefined}
      >
        <div className="relative z-[1] mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </p>
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              state === "IN"
                ? "bg-destructive/15 text-destructive"
                : state === "POST"
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {state === "IN" ? (
              <span className="h-1.5 w-1.5 rounded-full bg-destructive motion-safe:animate-pulse" />
            ) : null}
            {view.rawState}
          </span>
        </div>

        {state === "BYE" ? (
          <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-3">
            <TeamSide
              side={team}
              showScore={false}
              showRank={showRank}
              outline={outline}
            />
            <p className="text-sm text-muted-foreground">Bye week</p>
          </div>
        ) : state === "NOT_FOUND" ? (
          <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <p className="font-display text-lg font-semibold">No game</p>
            <p className="text-sm text-muted-foreground">
              {view.apiMessage ?? "Sensor has no upcoming game data."}
            </p>
          </div>
        ) : (
          <>
            <div className="relative flex flex-1 items-center gap-2">
              {showCenterLeagueLogo ? (
                <img
                  src={view.leagueLogo}
                  alt=""
                  aria-hidden
                  referrerPolicy="no-referrer"
                  className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] max-h-28 w-auto max-w-[45%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.12] select-none dark:opacity-[0.16]"
                />
              ) : null}
              <TeamSide
                side={left}
                showScore={showScore}
                showRank={showRank}
                outline={outline}
                emphasize={
                  state === "POST" &&
                  ((homeSide === "left" && teamWinning) ||
                    (homeSide === "right" && oppWinning))
                }
              />
              <div className="relative z-[1] shrink-0 px-1 text-center text-muted-foreground">
                <p className="font-display text-lg font-semibold">
                  {state === "PRE" ? "vs" : "–"}
                </p>
              </div>
              <TeamSide
                side={right}
                showScore={showScore}
                showRank={showRank}
                outline={outline}
                emphasize={
                  state === "POST" &&
                  ((homeSide === "right" && teamWinning) ||
                    (homeSide === "left" && oppWinning))
                }
              />
            </div>
            <div className="relative z-[1] mt-3 min-w-0 border-t border-border/70 pt-2 text-center">
              <p className="text-sm font-medium tabular-nums">{statusLine}</p>
              {state === "PRE" && view.eventName ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {view.eventName}
                </p>
              ) : null}
              {showLastPlay && view.lastPlay && state === "IN" ? (
                <LastPlayMarquee text={view.lastPlay} />
              ) : place && state === "PRE" ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {place}
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export const teamCardWidget = defineWidget({
  id: "@ethio/teamtracker/team-card",
  name: "Team Card",
  description: "Scoreboard for a SofaScore team sensor (sensor.arsenal)",
  component: TeamCard,
  configSchema: teamCardConfigSchema,
  defaultConfig: {
    title: "",
    entity_id: "",
    home_side: "left",
    show_league: false,
    show_league_logo: false,
    show_rank: true,
    show_last_play: true,
    outline: false,
    score_celebration: false,
    opponent_celebration: false,
    celebration_sound: false,
  },
  defaultSize: { w: 6, h: 4, minW: 4, minH: 3, maxW: 12, maxH: 8 },
  minSize: { w: 4, h: 3 },
  maxSize: { w: 12, h: 8 },
  entityDomains: ["sensor"],
  capabilities: ["entity.read", "service.call"],
});
