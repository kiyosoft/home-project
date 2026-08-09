import { z } from "zod";

import {
  defineWidget,
  useEntity,
  useEntityDetail,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

import { TeamScoreCelebrationHost } from "./ScoreCelebration";

export const teamCardConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
  card_title: z.string().optional(),
  home_side: z.enum(["left", "right"]).default("left"),
  show_league: z.boolean().default(false),
  show_league_logo: z.boolean().default(false),
  show_rank: z.boolean().default(true),
  outline: z.boolean().default(false),
  score_celebration: z.boolean().default(false),
  opponent_celebration: z.boolean().default(false),
  celebration_sound: z.boolean().default(false),
});

type Attrs = Record<string, unknown>;

function str(attrs: Attrs, key: string): string | undefined {
  const value = attrs[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function num(attrs: Attrs, key: string): number | undefined {
  const value = attrs[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

/** Parse ha-teamtracker colors (comma string or string[]). */
function parseColors(attrs: Attrs, key: string): string[] {
  const value = attrs[key];
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
      .map((item) => item.trim());
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}

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

function TeamSide({
  abbr,
  name,
  logo,
  score,
  rank,
  showRank,
  color,
  outline,
  emphasize,
}: {
  abbr?: string;
  name?: string;
  logo?: string;
  score?: number;
  rank?: number;
  showRank: boolean;
  color?: string;
  outline: boolean;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`relative z-[1] flex min-w-0 flex-1 flex-col items-center gap-2 ${
        emphasize ? "opacity-100" : ""
      }`}
    >
      <div
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-background/70 backdrop-blur-[2px]"
        style={
          outline && color
            ? { boxShadow: `0 0 0 2px ${color}` }
            : undefined
        }
      >
        {logo ? (
          <img src={logo} alt={abbr ?? name ?? "team"} className="h-12 w-12 object-contain" />
        ) : (
          <span className="font-display text-lg font-semibold">{abbr ?? "?"}</span>
        )}
      </div>
      <div className="text-center">
        {showRank && rank != null ? (
          <p className="text-[10px] text-muted-foreground">#{rank}</p>
        ) : null}
        <p className="truncate text-sm font-semibold tracking-wide">
          {abbr ?? name ?? "—"}
        </p>
        {name && abbr ? (
          <p className="truncate text-[11px] text-muted-foreground">{name}</p>
        ) : null}
      </div>
      {score != null ? (
        <p
          className={`font-display text-3xl font-semibold tabular-nums ${
            emphasize ? "text-primary" : ""
          }`}
        >
          {score}
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
  const homeSide = config.home_side === "right" ? "right" : "left";
  const showLeague = Boolean(config.show_league);
  const showLeagueLogo = Boolean(config.show_league_logo);
  const showRank = config.show_rank !== false;
  const outline = Boolean(config.outline);
  const scoreCelebration = Boolean(config.score_celebration);
  const opponentCelebration = Boolean(config.opponent_celebration);
  const celebrationSound = Boolean(config.celebration_sound);

  if (!entityId) {
    return (
      <div className="flex h-full min-h-40 flex-col justify-center rounded-2xl border border-border bg-card p-5">
        <p className="font-display text-base font-semibold">
          {customTitle || cardTitle || "Team Card"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Bind a ha-teamtracker sensor in settings.
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

  const attrs = entity.attributes;
  const state = entity.state;
  const league = str(attrs, "league");
  const sport = str(attrs, "sport");
  const leagueLogo = str(attrs, "league_logo");
  const clock = str(attrs, "clock");
  const date = str(attrs, "date");
  const kickoff = str(attrs, "kickoff_in");
  const venue = str(attrs, "venue");
  const apiMessage = str(attrs, "api_message");

  const teamColors = parseColors(attrs, "team_colors");
  const opponentColors = parseColors(attrs, "opponent_colors");

  const team = {
    abbr: str(attrs, "team_abbr"),
    name: str(attrs, "team_name"),
    logo: str(attrs, "team_logo"),
    score: num(attrs, "team_score"),
    rank: num(attrs, "team_rank"),
    color: teamColors[0],
  };
  const opponent = {
    abbr: str(attrs, "opponent_abbr"),
    name: str(attrs, "opponent_name"),
    logo: str(attrs, "opponent_logo"),
    score: num(attrs, "opponent_score"),
    rank: num(attrs, "opponent_rank"),
    color: opponentColors[0],
  };

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

  let statusLine = state;
  if (state === "PRE") {
    statusLine = kickoff ?? date ?? "Upcoming";
  } else if (state === "IN") {
    statusLine = clock ?? "Live";
  } else if (state === "POST") {
    statusLine = "Final";
  } else if (state === "BYE") {
    statusLine = "Bye week";
  } else if (state === "NOT_FOUND") {
    statusLine = apiMessage ?? "No game found";
  }

  const title =
    customTitle ||
    cardTitle ||
    (showLeague && league ? league : sport ? sport.toUpperCase() : "Team Tracker");
  const showScore = state === "IN" || state === "POST";
  const gradient = teamGradient(left.color, right.color);
  const showCenterLeagueLogo = showLeagueLogo && Boolean(leagueLogo);

  return (
    <>
      <TeamScoreCelebrationHost
        celebrateTeam={scoreCelebration}
        celebrateOpponent={opponentCelebration}
        cheerEnabled={celebrationSound}
        teamScore={team.score}
        opponentScore={opponent.score}
        gameState={state}
        teamColors={teamColors}
        opponentColors={opponentColors}
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
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              state === "IN"
                ? "bg-destructive/15 text-destructive"
                : state === "POST"
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {state}
          </span>
        </div>

        {state === "BYE" ? (
          <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-3">
            <TeamSide
              {...team}
              showRank={showRank}
              outline={outline}
            />
            <p className="text-sm text-muted-foreground">Bye week</p>
          </div>
        ) : state === "NOT_FOUND" ? (
          <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <p className="font-display text-lg font-semibold">No game</p>
            <p className="text-sm text-muted-foreground">
              {apiMessage ?? "Sensor has no upcoming game data."}
            </p>
          </div>
        ) : (
          <>
            <div className="relative flex flex-1 items-center gap-2">
              {showCenterLeagueLogo ? (
                <img
                  src={leagueLogo}
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] max-h-28 w-auto max-w-[45%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.12] select-none dark:opacity-[0.16]"
                />
              ) : null}
              <TeamSide
                {...left}
                score={showScore ? left.score : undefined}
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
                {...right}
                score={showScore ? right.score : undefined}
                showRank={showRank}
                outline={outline}
                emphasize={
                  state === "POST" &&
                  ((homeSide === "right" && teamWinning) ||
                    (homeSide === "left" && oppWinning))
                }
              />
            </div>
            <div className="relative z-[1] mt-3 border-t border-border/70 pt-2 text-center">
              <p className="text-sm font-medium">{statusLine}</p>
              {venue && state === "PRE" ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {venue}
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
  description: "Live scoreboard for ha-teamtracker sensors",
  component: TeamCard,
  configSchema: teamCardConfigSchema,
  defaultConfig: {
    title: "",
    entity_id: "",
    home_side: "left",
    show_league: false,
    show_league_logo: false,
    show_rank: true,
    outline: false,
    score_celebration: false,
    opponent_celebration: false,
    celebration_sound: false,
  },
  defaultSize: { w: 6, h: 4, minW: 4, minH: 3, maxW: 12, maxH: 8 },
  minSize: { w: 4, h: 3 },
  maxSize: { w: 12, h: 8 },
  entityDomains: ["sensor"],
  capabilities: ["entity.read"],
});
