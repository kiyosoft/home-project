import type { HassEntity } from "./types";

export interface TeamSide {
  abbr?: string;
  name?: string;
  logo?: string;
  score?: number;
  rank?: number;
  colors: string[];
}

export type TeamTrackerState =
  | "PRE"
  | "IN"
  | "POST"
  | "BYE"
  | "NOT_FOUND"
  | "unknown";

export interface TeamTrackerView {
  entityId: string;
  state: TeamTrackerState;
  rawState: string;
  league?: string;
  sport?: string;
  leagueLogo?: string;
  clock?: string;
  quarter?: string | number;
  date?: string;
  kickoff?: string;
  venue?: string;
  lastPlay?: string;
  apiMessage?: string;
  team: TeamSide;
  opponent: TeamSide;
  /** Resolved in-game clock: "67'", "Half time", "1st · 12:34". */
  inGameClock: string;
}

function str(attrs: Record<string, unknown>, key: string): string | undefined {
  const value = attrs[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function num(attrs: Record<string, unknown>, key: string): number | undefined {
  const value = attrs[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

/** ha-teamtracker sends a comma string or a string[]. Keep only #hex colours. */
function parseColors(attrs: Record<string, unknown>, key: string): string[] {
  const value = attrs[key];
  const parts: string[] = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" && item.trim()) parts.push(item.trim());
    }
  } else if (typeof value === "string" && value.trim()) {
    parts.push(...value.split(",").map((part) => part.trim()).filter(Boolean));
  }
  return parts
    .map(expandHex)
    .filter((color): color is string => Boolean(color));
}

function expandHex(color: string): string | undefined {
  const raw = color.startsWith("#") ? color.slice(1) : color;
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`;
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`;
  }
  return undefined;
}

function parseState(raw: string): TeamTrackerState {
  if (raw === "PRE" || raw === "IN" || raw === "POST" || raw === "BYE") {
    return raw;
  }
  if (raw === "NOT_FOUND") return "NOT_FOUND";
  return "unknown";
}

const PAUSE_CLOCK: Record<string, string> = {
  HT: "Half time",
  FT: "Full time",
  OT: "Extra time",
  ET: "Extra time",
  AET: "Extra time",
  PEN: "Penalties",
};

function isPauseClock(clock?: string): boolean {
  if (!clock) return false;
  const key = clock.trim().toUpperCase();
  return key in PAUSE_CLOCK || key.includes("HALF");
}

/** Latest `21'` / `45'+2` stamp from soccer last_play event text. */
function latestPlayClock(lastPlay?: string): string | undefined {
  if (!lastPlay) return undefined;
  const matches = [...lastPlay.matchAll(/(\d{1,3}(?:\+\d+)?)\s*'/g)];
  const stamp = matches.at(-1)?.[1];
  return stamp ? `${stamp}'` : undefined;
}

/** True when last_play is past the break that `clock` is still labelling. */
function playResumedAfterPause(clock: string, playClock: string): boolean {
  const key = clock.trim().toUpperCase();
  const minute = Number.parseInt(playClock, 10);
  if (!Number.isFinite(minute)) return false;
  if (key === "HT" || clock.toLowerCase().includes("half")) return minute > 45;
  return false;
}

function quarterLabel(quarter?: string | number): string | undefined {
  if (quarter == null || quarter === "") return undefined;
  const numeric =
    typeof quarter === "number" ? quarter : Number.parseInt(String(quarter), 10);
  if (Number.isFinite(numeric) && String(numeric) === String(quarter).trim()) {
    if (numeric === 1) return "1st";
    if (numeric === 2) return "2nd";
    if (numeric === 3) return "ET";
    if (numeric === 4) return "ET2";
    if (numeric >= 5) return "Pens";
  }
  const raw = String(quarter).trim();
  return raw || undefined;
}

/**
 * ESPN shortDetail is "HT" at the break, and can linger after kickoff.
 * Trust that pause unless last_play is clearly into the next half.
 */
export function inGameClock(
  clock?: string,
  quarter?: string | number,
  lastPlay?: string,
): string {
  const playClock = latestPlayClock(lastPlay);
  const period = quarterLabel(quarter);

  if (clock && !isPauseClock(clock)) {
    if (period && !clock.toLowerCase().includes(period.toLowerCase())) {
      return `${period} · ${clock}`;
    }
    return clock;
  }

  if (clock && playClock && playResumedAfterPause(clock, playClock)) {
    return playClock;
  }

  if (clock) {
    const readable = PAUSE_CLOCK[clock.trim().toUpperCase()];
    if (readable) return readable;
    if (clock.toLowerCase().includes("half")) return "Half time";
    return clock;
  }

  return playClock ?? period ?? "Live";
}

function parseSide(
  attrs: Record<string, unknown>,
  prefix: "team" | "opponent",
): TeamSide {
  return {
    abbr: str(attrs, `${prefix}_abbr`),
    name: str(attrs, `${prefix}_name`),
    logo: str(attrs, `${prefix}_logo`),
    score: num(attrs, `${prefix}_score`),
    rank: num(attrs, `${prefix}_rank`),
    colors: parseColors(attrs, `${prefix}_colors`),
  };
}

/**
 * True for ha-teamtracker sensors, not ordinary sensors. Matches the integration
 * by id slug or by the sport + team_abbr signature it always publishes.
 */
export function isTeamTrackerEntity(entity: HassEntity): boolean {
  const id = entity.entity_id;
  if (!id.startsWith("sensor.")) return false;
  const slug = id.slice("sensor.".length).toLowerCase();
  if (slug.includes("teamtracker") || slug.includes("team_tracker")) return true;
  const attrs = entity.attributes;
  return (
    typeof attrs.sport === "string" &&
    typeof attrs.team_abbr === "string" &&
    attrs.sport.trim() !== "" &&
    attrs.team_abbr.trim() !== ""
  );
}

export function deriveTeamTracker(
  entity: HassEntity | undefined,
): TeamTrackerView | null {
  if (!entity) return null;
  const attrs = entity.attributes;
  const clock = str(attrs, "clock");
  const quarter = str(attrs, "quarter") ?? num(attrs, "quarter");
  const lastPlay = str(attrs, "last_play");
  return {
    entityId: entity.entity_id,
    state: parseState(entity.state),
    rawState: entity.state,
    league: str(attrs, "league"),
    sport: str(attrs, "sport"),
    leagueLogo: str(attrs, "league_logo"),
    clock,
    quarter,
    date: str(attrs, "date"),
    kickoff: str(attrs, "kickoff_in"),
    venue: str(attrs, "venue"),
    lastPlay,
    apiMessage: str(attrs, "api_message"),
    team: parseSide(attrs, "team"),
    opponent: parseSide(attrs, "opponent"),
    inGameClock: inGameClock(clock, quarter, lastPlay),
  };
}
